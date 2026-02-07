/**
 * Clawe Notification Watcher
 *
 * 1. On startup: ensures heartbeat crons are configured for all agents
 * 2. Continuously: polls Convex for undelivered notifications and delivers them
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
} from "@clawe/shared/openclaw";
import { validateEnv, config, POLL_INTERVAL_MS } from "./config.js";

// Validate environment on startup
validateEnv();

const convex = new ConvexHttpClient(config.convexUrl);

// Agent configuration
const AGENTS = [
  {
    id: "main",
    name: "Clawe",
    emoji: "🦞",
    role: "Squad Lead",
    cron: "0 * * * *",
  },
  {
    id: "inky",
    name: "Inky",
    emoji: "✍️",
    role: "Writer",
    cron: "3,18,33,48 * * * *",
  },
  {
    id: "pixel",
    name: "Pixel",
    emoji: "🎨",
    role: "Designer",
    cron: "7,22,37,52 * * * *",
  },
  {
    id: "scout",
    name: "Scout",
    emoji: "🔍",
    role: "SEO",
    cron: "11,26,41,56 * * * *",
  },
];

const HEARTBEAT_MESSAGE =
  "Read HEARTBEAT.md and follow it strictly. Check for notifications with 'clawe check'. If nothing needs attention, reply HEARTBEAT_OK.";

/**
 * Register all agents in Convex (upsert - creates or updates)
 */
async function registerAgents(): Promise<void> {
  console.log("[watcher] Registering agents in Convex...");

  for (const agent of AGENTS) {
    const sessionKey = `agent:${agent.id}:main`;

    try {
      await convex.mutation(api.agents.upsert, {
        name: agent.name,
        role: agent.role,
        sessionKey,
        emoji: agent.emoji,
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

  console.log("[watcher] Agent registration complete.\n");
}

/**
 * Setup heartbeat crons for all agents (if not already configured)
 */
async function setupCrons(): Promise<void> {
  console.log("[watcher] Checking heartbeat crons...");

  const result = await cronList();
  if (!result.ok) {
    console.error("[watcher] Failed to list crons:", result.error?.message);
    return;
  }

  const existingNames = new Set(result.result.jobs.map((j) => j.name));

  for (const agent of AGENTS) {
    const cronName = `${agent.id}-heartbeat`;

    if (existingNames.has(cronName)) {
      console.log(`[watcher] ✓ ${agent.name} ${agent.emoji} heartbeat exists`);
      continue;
    }

    console.log(`[watcher] Adding ${agent.name} ${agent.emoji} heartbeat...`);

    const job: CronAddJob = {
      name: cronName,
      agentId: agent.id,
      enabled: true,
      schedule: { kind: "cron", expr: agent.cron },
      sessionTarget: "isolated",
      payload: {
        kind: "agentTurn",
        message: HEARTBEAT_MESSAGE,
        model: "anthropic/claude-sonnet-4-20250514",
        timeoutSeconds: 600,
      },
    };

    const addResult = await cronAdd(job);
    if (addResult.ok) {
      console.log(
        `[watcher] ✓ ${agent.name} ${agent.emoji} heartbeat: ${agent.cron}`,
      );
    } else {
      console.error(
        `[watcher] Failed to add ${cronName}:`,
        addResult.error?.message,
      );
    }
  }

  console.log("[watcher] Cron setup complete.\n");
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
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  // Register agents in Convex
  await registerAgents();

  // Setup crons on startup
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
