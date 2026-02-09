/**
 * Clawe Notification Watcher
 *
 * 1. On startup: registers default agents if none exist
 * 2. On startup: ensures heartbeat crons are configured for all agents
 * 3. Continuously: polls Convex for undelivered notifications and delivers them
 *
 * Agents are read from Convex — no hardcoded list.
 * New agents can be added at runtime via CLI or API.
 *
 * Environment variables:
 *   CONVEX_URL        - Convex deployment URL
 *   OPENCLAW_URL      - OpenClaw gateway URL
 *   OPENCLAW_TOKEN    - OpenClaw authentication token
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@clawe/backend";
import {
  sessionsSend,
  cronList,
  cronAdd,
  type CronAddJob,
  type CronJob,
} from "@clawe/shared/openclaw";
import { validateEnv, config, POLL_INTERVAL_MS } from "./config.js";

// Validate environment on startup
validateEnv();

const convex = new ConvexHttpClient(config.convexUrl);

// Default agents — only used on first run when Convex is empty
const DEFAULT_AGENTS = [
  {
    id: "main",
    name: "Clawe",
    emoji: "🦞",
    role: "Squad Lead",
    cron: "0,15,30,45 * * * *",
    agentType: "lead" as const,
  },
  {
    id: "inky",
    name: "Inky",
    emoji: "✍️",
    role: "Writer",
    cron: "3,18,33,48 * * * *",
    agentType: "worker" as const,
  },
  {
    id: "pixel",
    name: "Pixel",
    emoji: "🎨",
    role: "Designer",
    cron: "7,22,37,52 * * * *",
    agentType: "worker" as const,
  },
  {
    id: "scout",
    name: "Scout",
    emoji: "🔍",
    role: "SEO",
    cron: "11,26,41,56 * * * *",
    agentType: "worker" as const,
  },
];

const HEARTBEAT_MESSAGE =
  "Read HEARTBEAT.md and follow it strictly. Check for notifications with 'clawe check'. If nothing needs attention, reply HEARTBEAT_OK.";

const STARTUP_RETRY_ATTEMPTS = 10;
const STARTUP_RETRY_DELAY_MS = 3000;

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = STARTUP_RETRY_ATTEMPTS,
  baseDelayMs = STARTUP_RETRY_DELAY_MS,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxAttempts) {
        console.error(
          `[watcher] ${label} failed after ${maxAttempts} attempts:`,
          lastError.message,
        );
        throw lastError;
      }

      const delayMs = baseDelayMs * attempt;
      console.log(
        `[watcher] ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs / 1000}s...`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Register default agents in Convex (only if no agents exist yet)
 */
async function registerDefaultAgents(): Promise<void> {
  console.log("[watcher] Checking for existing agents in Convex...");

  const existingAgents = await withRetry(async () => {
    return await convex.query(api.agents.list, {});
  }, "Convex connection");

  if (existingAgents.length > 0) {
    console.log(
      `[watcher] Found ${existingAgents.length} agent(s) in Convex. Skipping default registration.`,
    );
    return;
  }

  console.log("[watcher] No agents found. Registering defaults...");

  for (const agent of DEFAULT_AGENTS) {
    const sessionKey = `agent:${agent.id}:main`;

    try {
      await convex.mutation(api.agents.upsert, {
        name: agent.name,
        role: agent.role,
        sessionKey,
        emoji: agent.emoji,
        agentType: agent.agentType,
        cronSchedule: agent.cron,
      });
      console.log(
        `[watcher] ✓ ${agent.name} ${agent.emoji} registered (${sessionKey})`,
      );
    } catch (err) {
      console.error(
        `[watcher] Failed to register ${agent.name}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log("[watcher] Default agent registration complete.\n");
}

/**
 * Setup heartbeat crons for all agents from Convex
 */
async function setupCrons(): Promise<void> {
  console.log("[watcher] Syncing heartbeat crons...");

  // Get agents from Convex
  const agents = await withRetry(async () => {
    return await convex.query(api.agents.list, {});
  }, "Convex agent list");

  // Get existing crons from OpenClaw
  const result = await withRetry(async () => {
    const res = await cronList();
    if (!res.ok) {
      throw new Error(res.error?.message ?? "Failed to list crons");
    }
    return res;
  }, "OpenClaw connection");

  const existingNames = new Set(
    result.result.details.jobs.map((j: CronJob) => j.name),
  );

  for (const agent of agents) {
    // Extract agent ID from sessionKey (agent:<id>:main)
    const agentId = agent.sessionKey.split(":")[1];
    if (!agentId) continue;

    const cronSchedule = agent.cronSchedule;
    if (!cronSchedule) {
      console.log(
        `[watcher] ⏭ ${agent.name} ${agent.emoji || ""} — no cron schedule, skipping`,
      );
      continue;
    }

    const cronName = `${agentId}-heartbeat`;

    if (existingNames.has(cronName)) {
      console.log(
        `[watcher] ✓ ${agent.name} ${agent.emoji || ""} heartbeat exists`,
      );
      continue;
    }

    console.log(
      `[watcher] Adding ${agent.name} ${agent.emoji || ""} heartbeat...`,
    );

    const job: CronAddJob = {
      name: cronName,
      agentId: agentId,
      enabled: true,
      schedule: { kind: "cron", expr: cronSchedule },
      sessionTarget: "isolated",
      payload: {
        kind: "agentTurn",
        message: HEARTBEAT_MESSAGE,
        model: agent.model || "anthropic/claude-sonnet-4-20250514",
        timeoutSeconds: 600,
      },
      delivery: { mode: "none" },
    };

    const addResult = await cronAdd(job);
    if (addResult.ok) {
      console.log(
        `[watcher] ✓ ${agent.name} ${agent.emoji || ""} heartbeat: ${cronSchedule}`,
      );
    } else {
      console.error(
        `[watcher] Failed to add ${cronName}:`,
        addResult.error?.message,
      );
    }
  }

  console.log("[watcher] Cron sync complete.\n");
}

/**
 * Format a notification for delivery to an agent
 */
function formatNotification(notification: {
  content: string;
  sourceAgent?: { name: string } | null;
  task?: { title: string; status: string } | null;
}): string {
  const parts: string[] = [];

  if (notification.sourceAgent?.name) {
    parts.push(`📨 From ${notification.sourceAgent.name}:`);
  } else {
    parts.push("📨 Notification:");
  }

  parts.push(notification.content);

  if (notification.task) {
    parts.push(
      `\n📋 Task: ${notification.task.title} (${notification.task.status})`,
    );
  }

  return parts.join("\n");
}

/**
 * Deliver notifications to a single agent
 */
async function deliverToAgent(sessionKey: string): Promise<void> {
  try {
    // Get undelivered notifications for this agent
    const notifications = await convex.query(api.notifications.getUndelivered, {
      sessionKey,
    });

    if (notifications.length === 0) {
      return;
    }

    console.log(
      `[watcher] 📬 ${sessionKey} has ${notifications.length} pending notification(s)`,
    );

    for (const notification of notifications) {
      try {
        // Format the notification message
        const message = formatNotification(notification);

        // Try to deliver to agent session
        const result = await sessionsSend(sessionKey, message, 10);

        if (result.ok) {
          // Mark as delivered in Convex
          await convex.mutation(api.notifications.markDelivered, {
            notificationIds: [notification._id],
          });

          console.log(
            `[watcher] ✅ Delivered to ${sessionKey}: ${notification.content.slice(0, 50)}...`,
          );
        } else {
          // Agent might be asleep or session unavailable
          console.log(
            `[watcher] 💤 ${sessionKey} unavailable: ${result.error?.message ?? "unknown error"}`,
          );
        }
      } catch (err) {
        // Network error or agent asleep
        console.log(
          `[watcher] 💤 ${sessionKey} error: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    }
  } catch (err) {
    console.error(
      `[watcher] Error checking ${sessionKey}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Main delivery loop
 */
async function deliveryLoop(): Promise<void> {
  // Get all registered agents from Convex
  const agents = await convex.query(api.agents.list, {});

  for (const agent of agents) {
    if (agent.sessionKey) {
      await deliverToAgent(agent.sessionKey);
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log("[watcher] 🦞 Clawe Watcher starting...");
  console.log(`[watcher] Convex: ${config.convexUrl}`);
  console.log(`[watcher] OpenClaw: ${config.openclawUrl}`);
  console.log(`[watcher] Poll interval: ${POLL_INTERVAL_MS}ms\n`);

  // Register default agents if Convex is empty
  await registerDefaultAgents();

  // Setup crons from Convex agent data
  await setupCrons();

  console.log("[watcher] Starting notification delivery loop...\n");

  // Main loop
  while (true) {
    try {
      await deliveryLoop();
    } catch (err) {
      console.error(
        "[watcher] Loop error:",
        err instanceof Error ? err.message : err,
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

// Start the watcher
main().catch((err) => {
  console.error("[watcher] Fatal error:", err);
  process.exit(1);
});
