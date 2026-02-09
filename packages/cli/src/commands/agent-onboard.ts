import { client } from "../client.js";
import { api } from "@clawe/backend";

interface OnboardOptions {
  emoji?: string;
  cron?: string;
  model?: string;
  type?: string;
}

// OpenClaw API helper
const OPENCLAW_URL = process.env.OPENCLAW_URL || "http://localhost:18789";
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || "";

async function openclawInvoke(
  tool: string,
  args?: Record<string, unknown>,
): Promise<{ ok: boolean; result?: any; error?: { message: string } }> {
  try {
    const res = await fetch(`${OPENCLAW_URL}/tools/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({ tool, args }),
    });
    return (await res.json()) as {
      ok: boolean;
      result?: any;
      error?: { message: string };
    };
  } catch {
    return { ok: false, error: { message: "Failed to connect to OpenClaw" } };
  }
}

export async function agentOnboard(
  agentId: string,
  name: string,
  role: string,
  options: OnboardOptions,
): Promise<void> {
  const emoji = options.emoji || "🤖";
  const cronSchedule = options.cron || "15,45 * * * *";
  const model = options.model || "anthropic/claude-sonnet-4-20250514";
  const agentType = (options.type || "worker") as "lead" | "worker";
  const sessionKey = `agent:${agentId}:main`;

  console.log(`🦞 Onboarding agent: ${name} ${emoji}`);
  console.log(`   ID: ${agentId}`);
  console.log(`   Role: ${role}`);
  console.log(`   Type: ${agentType}`);
  console.log(`   Session: ${sessionKey}`);
  console.log(`   Cron: ${cronSchedule}`);
  console.log(`   Model: ${model}`);
  console.log("");

  // Step 1: Register in Convex
  console.log("1. Registering in Convex...");
  try {
    await client.mutation(api.agents.upsert, {
      name,
      role,
      sessionKey,
      emoji,
      agentType,
      cronSchedule,
      model,
    });
    console.log("   ✓ Agent registered in Convex");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to register agent in Convex: ${message}`);
  }

  // Step 2: Create workspace from base templates
  console.log("2. Creating workspace...");
  try {
    const {
      readdirSync,
      readFileSync,
      writeFileSync,
      mkdirSync,
      existsSync,
      symlinkSync,
    } = await import("fs");
    const { join } = await import("path");

    const dataDir = process.env.OPENCLAW_DATA_DIR || "/data";
    const templatesDir =
      process.env.CLAWE_TEMPLATES_DIR || "/opt/clawe/templates";
    const baseDir = join(templatesDir, "base", agentType);
    const workspacesDir = join(templatesDir, "workspaces");
    const wsDir =
      agentType === "lead"
        ? join(dataDir, "workspace")
        : join(dataDir, `workspace-${agentId}`);

    // Create workspace directory
    mkdirSync(join(wsDir, "memory"), { recursive: true });

    // Generate files from base templates using variable substitution
    if (existsSync(baseDir)) {
      const templates = readdirSync(baseDir).filter((f) => f.endsWith(".md"));
      for (const template of templates) {
        const content = readFileSync(join(baseDir, template), "utf-8");
        const result = content
          .replace(/\$\{AGENT_ID\}/g, agentId)
          .replace(/\$\{AGENT_NAME\}/g, name)
          .replace(/\$\{AGENT_EMOJI\}/g, emoji)
          .replace(/\$\{AGENT_ROLE\}/g, role);
        writeFileSync(join(wsDir, template), result);
      }
      console.log("   ✓ Base templates generated");
    } else {
      console.log(
        `   ⚠ Base templates not found at ${baseDir}, creating minimal workspace`,
      );
      writeFileSync(
        join(wsDir, "AGENTS.md"),
        `# AGENTS.md\n\nSession key: ${sessionKey}\n\nRun \`clawe check ${sessionKey}\` on wake.\n`,
      );
    }

    // Copy agent-specific files if they exist
    const agentSpecificDir = join(workspacesDir, agentId);
    if (existsSync(agentSpecificDir)) {
      const files = readdirSync(agentSpecificDir);
      for (const file of files) {
        const src = join(agentSpecificDir, file);
        writeFileSync(join(wsDir, file), readFileSync(src));
      }
      console.log("   ✓ Agent-specific files copied");
    } else {
      // Generate a default SOUL.md
      writeFileSync(
        join(wsDir, "SOUL.md"),
        `# SOUL.md — Who You Are

You are **${name}**, the ${role}. ${emoji}

## Role

You're a specialist agent in the Clawe squad.

## Task Discipline

⚠️ **Follow task workflow COMPLETELY:**
- Do NOT move to "review" until ALL subtasks are done
- Register deliverables with \`clawe deliver\`
- Only submit for review when work is truly complete
`,
      );
      console.log("   ✓ Default SOUL.md created");
    }

    // Symlink shared directory
    const sharedLink = join(wsDir, "shared");
    const sharedTarget = join(dataDir, "shared");
    if (!existsSync(sharedLink) && existsSync(sharedTarget)) {
      symlinkSync(sharedTarget, sharedLink);
      console.log("   ✓ Shared directory linked");
    }

    console.log(`   ✓ Workspace created at ${wsDir}`);
  } catch (err) {
    console.error(
      "   ✗ Failed to create workspace:",
      err instanceof Error ? err.message : err,
    );
    console.log("   → You may need to create the workspace manually");
  }

  // Step 3: Patch OpenClaw config to add agent
  console.log("3. Patching OpenClaw config...");
  try {
    const dataDir = process.env.OPENCLAW_DATA_DIR || "/data";
    const workspace =
      agentType === "lead"
        ? `${dataDir}/workspace`
        : `${dataDir}/workspace-${agentId}`;

    // Get current config
    const currentConfig = await openclawInvoke("gateway", {
      action: "config.get",
    });

    if (!currentConfig.ok) {
      throw new Error("Failed to get current config");
    }

    const cfg = currentConfig.result?.details ?? currentConfig.result;
    const existingAgents: Array<{ id: string; [key: string]: unknown }> =
      cfg?.agents?.list || [];

    if (existingAgents.some((a) => a.id === agentId)) {
      console.log("   ✓ Agent already in OpenClaw config");
    } else {
      const updatedList = [
        ...existingAgents,
        {
          id: agentId,
          name: name,
          workspace: workspace,
          model: model,
          identity: { name, emoji },
        },
      ];

      const existingAllow: string[] = cfg?.tools?.agentToAgent?.allow || [];
      const updatedAllow = existingAllow.includes(agentId)
        ? existingAllow
        : [...existingAllow, agentId];

      const result = await openclawInvoke("gateway", {
        action: "config.patch",
        raw: JSON.stringify({
          agents: { list: updatedList },
          tools: { agentToAgent: { enabled: true, allow: updatedAllow } },
        }),
      });

      if (result.ok) {
        console.log("   ✓ OpenClaw config patched (agent added)");
      } else {
        console.log(
          "   ⚠ Config patch:",
          result.error?.message || "unknown error",
        );
      }
    }
  } catch (err) {
    console.error(
      "   ✗ Failed to patch config:",
      err instanceof Error ? err.message : err,
    );
    console.log(
      "   → You may need to add the agent to openclaw config manually",
    );
  }

  // Step 4: Add heartbeat cron
  console.log("4. Adding heartbeat cron...");
  try {
    const cronName = `${agentId}-heartbeat`;

    // Check if cron already exists
    const listResult = await openclawInvoke("cron", { action: "list" });

    if (listResult.ok) {
      const jobs = listResult.result?.details?.jobs || [];
      const exists = jobs.some((j: { name: string }) => j.name === cronName);

      if (exists) {
        console.log("   ✓ Heartbeat cron already exists");
      } else {
        const addResult = await openclawInvoke("cron", {
          action: "add",
          job: {
            name: cronName,
            agentId: agentId,
            enabled: true,
            schedule: { kind: "cron", expr: cronSchedule },
            sessionTarget: "isolated",
            payload: {
              kind: "agentTurn",
              message:
                "Read HEARTBEAT.md and follow it strictly. Check for notifications with 'clawe check'. If nothing needs attention, reply HEARTBEAT_OK.",
              model: model,
              timeoutSeconds: 600,
            },
          },
        });

        if (addResult.ok) {
          console.log(`   ✓ Heartbeat cron added: ${cronSchedule}`);
        } else {
          console.log("   ⚠ Failed to add cron:", addResult.error?.message);
        }
      }
    }
  } catch (err) {
    console.error(
      "   ✗ Failed to add cron:",
      err instanceof Error ? err.message : err,
    );
  }

  // Done
  console.log("");
  console.log(`✅ Agent ${name} ${emoji} onboarded successfully!`);
  console.log("");
  console.log("The agent will start working on the next heartbeat.");
  if (agentType !== "lead") {
    console.log(`To customize, edit: /data/workspace-${agentId}/SOUL.md`);
  }
}
