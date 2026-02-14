/**
 * Clawe Notification Watcher
 *
 * 1. On startup: ensures heartbeat crons are configured for all agents
 * 2. Continuously: polls Convex for undelivered notifications and delivers them
 *
 * Environment variables:
 *   CONVEX_URL        - Convex deployment URL
 *   AGENCY_URL        - Agency gateway URL
 *   AGENCY_TOKEN      - Agency authentication token
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@clawe/backend";
import type { Doc } from "@clawe/backend/dataModel";
import {
  sessionsSend,
  cronList,
  cronAdd,
  type CronAddJob,
  type CronJob,
} from "@clawe/shared/agency";
import { getTimeInZone, DEFAULT_TIMEZONE } from "@clawe/shared/timezone";
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
    cron: "0,15,30,45 * * * *",
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

// Input type for creating a routine (fields required by routines.create mutation)
type RoutineInput = Pick<
  Doc<"routines">,
  "title" | "description" | "priority" | "schedule" | "color"
>;

// Routine seed data (hardcoded for initial setup)
const SEED_ROUTINES: RoutineInput[] = [
  {
    title: "Weekly Performance Review",
    description:
      "Review last week's content performance, engagement metrics, and campaign results. Identify top-performing pieces and areas for improvement.",
    priority: "normal",
    schedule: {
      type: "weekly",
      daysOfWeek: [1],
      hour: 9,
      minute: 0,
    },
    color: "emerald",
  },
  {
    title: "Morning Brief",
    description: "Prepare daily morning brief for the team",
    priority: "high",
    schedule: {
      type: "weekly",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      hour: 8,
      minute: 0,
    },
    color: "amber",
  },
  {
    title: "Competitor Scan",
    description: "Scan competitor activities and updates",
    priority: "normal",
    schedule: {
      type: "weekly",
      daysOfWeek: [1, 4],
      hour: 10,
      minute: 0,
    },
    color: "rose",
  },
];

const RETRY_BASE_DELAY_MS = 3000;
const RETRY_MAX_DELAY_MS = 30000;
const ROUTINE_CHECK_INTERVAL_MS = 10_000; // Check routines every 10 seconds

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function indefinitely with exponential backoff (capped)
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  baseDelayMs = RETRY_BASE_DELAY_MS,
): Promise<T> {
  let attempt = 0;

  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const delayMs = Math.min(baseDelayMs * attempt, RETRY_MAX_DELAY_MS);

      console.log(
        `[watcher] ${label} failed (attempt ${attempt}), retrying in ${delayMs / 1000}s... (${error.message})`,
      );
      await sleep(delayMs);
    }
  }
}

/**
 * Register all agents in Convex (upsert - creates or updates)
 */
async function registerAgents(): Promise<void> {
  console.log("[watcher] Registering agents in Convex...");
  console.log("[watcher] CONVEX_URL:", config.convexUrl);

  // Try to register first agent with retry (waits for Convex to be ready)
  const firstAgent = AGENTS[0];
  if (firstAgent) {
    await withRetry(async () => {
      const sessionKey = `agent:${firstAgent.id}:main`;
      await convex.mutation(api.agents.upsert, {
        name: firstAgent.name,
        role: firstAgent.role,
        sessionKey,
        emoji: firstAgent.emoji,
      });
      console.log(
        `[watcher] ✓ ${firstAgent.name} ${firstAgent.emoji} registered (${sessionKey})`,
      );
    }, "Convex connection");
  }

  // Register remaining agents (Convex is now ready)
  for (const agent of AGENTS.slice(1)) {
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

  // Retry getting cron list (waits for agency to be ready)
  const result = await withRetry(async () => {
    const res = await cronList();
    if (!res.ok) {
      throw new Error(res.error?.message ?? "Failed to list crons");
    }
    return res;
  }, "Agency connection");

  const existingNames = new Set(
    result.result.details.jobs.map((j: CronJob) => j.name),
  );

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
      delivery: { mode: "none" },
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
 * Seed initial routines if none exist
 */
async function seedRoutines(): Promise<void> {
  console.log("[watcher] Checking routines...");

  const existing = await convex.query(api.routines.list, {});

  if (existing.length > 0) {
    console.log(`[watcher] ✓ ${existing.length} routine(s) already exist`);
    return;
  }

  console.log("[watcher] Seeding initial routines...");

  for (const routine of SEED_ROUTINES) {
    try {
      await convex.mutation(api.routines.create, routine);
      console.log(`[watcher] ✓ Created routine: ${routine.title}`);
    } catch (err) {
      console.error(
        `[watcher] Failed to create routine "${routine.title}":`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log("[watcher] Routine seeding complete.\n");
}

/**
 * Check for due routines and trigger them.
 *
 * Uses a 1-hour window for crash tolerance: if a routine is scheduled
 * for 6:00 AM, it can trigger anytime between 6:00 AM and 6:59 AM.
 */
async function checkRoutines(): Promise<void> {
  try {
    // Get user's timezone from settings
    const timezone =
      (await convex.query(api.settings.getTimezone)) ?? DEFAULT_TIMEZONE;

    // Get current timestamp and time in user's timezone
    const now = new Date();
    const currentTimestamp = now.getTime();
    const { dayOfWeek, hour, minute } = getTimeInZone(now, timezone);

    // Query for due routines (with 1-hour window tolerance)
    const dueRoutines = await convex.query(api.routines.getDueRoutines, {
      currentTimestamp,
      dayOfWeek,
      hour,
      minute,
    });

    // Trigger each due routine
    for (const routine of dueRoutines) {
      try {
        const taskId = await convex.mutation(api.routines.trigger, {
          routineId: routine._id,
        });
        console.log(
          `[watcher] ✓ Triggered routine "${routine.title}" → task ${taskId}`,
        );
      } catch (err) {
        console.error(
          `[watcher] Failed to trigger routine "${routine.title}":`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  } catch (err) {
    console.error(
      "[watcher] Error checking routines:",
      err instanceof Error ? err.message : err,
    );
  }
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
 * Start the routine check loop (runs every 10 seconds)
 */
function startRoutineCheckLoop(): void {
  const runCheck = async () => {
    try {
      await checkRoutines();
    } catch (err) {
      console.error(
        "[watcher] Routine check error:",
        err instanceof Error ? err.message : err,
      );
    }
  };

  // Run immediately, then every 10 seconds
  void runCheck();
  setInterval(() => void runCheck(), ROUTINE_CHECK_INTERVAL_MS);
}

/**
 * Start the notification delivery loop
 */
async function startDeliveryLoop(): Promise<void> {
  while (true) {
    try {
      await deliveryLoop();
    } catch (err) {
      console.error(
        "[watcher] Delivery loop error:",
        err instanceof Error ? err.message : err,
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log("[watcher] 🦞 Clawe Watcher starting...");
  console.log(`[watcher] Convex: ${config.convexUrl}`);
  console.log(`[watcher] Agency: ${config.agencyUrl}`);
  console.log(`[watcher] Notification poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log(
    `[watcher] Routine check interval: ${ROUTINE_CHECK_INTERVAL_MS}ms\n`,
  );

  // Register agents in Convex
  await registerAgents();

  // Setup crons on startup
  await setupCrons();

  // Seed routines if needed
  await seedRoutines();

  console.log("[watcher] Starting loops...\n");

  // Start routine check loop (every 10 seconds)
  startRoutineCheckLoop();

  // Start notification delivery loop (uses POLL_INTERVAL_MS)
  await startDeliveryLoop();
}

// Start the watcher
main().catch((err) => {
  console.error("[watcher] Fatal error:", err);
  process.exit(1);
});
