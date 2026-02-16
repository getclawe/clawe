/**
 * Clawe Notification Watcher
 *
 * Continuously polls Convex for undelivered notifications and delivers them.
 * Also checks for due routines and triggers them.
 *
 * Setup logic (agent registration, cron setup, routine seeding) has been
 * moved to the provisioning API route (POST /api/tenant/provision).
 *
 * Multi-tenant: iterates over active tenants each loop iteration.
 * Queries Convex for all active tenants using WATCHER_TOKEN.
 *
 * Environment variables:
 *   CONVEX_URL        - Convex deployment URL
 *   WATCHER_TOKEN     - System-level auth token for querying all tenants
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@clawe/backend";
import { sessionsSend, type SquadhubConnection } from "@clawe/shared/squadhub";
import { getTimeInZone, DEFAULT_TIMEZONE } from "@clawe/shared/timezone";
import { validateEnv, config, POLL_INTERVAL_MS } from "./config.js";

// Validate environment on startup
validateEnv();

const convex = new ConvexHttpClient(config.convexUrl);

/**
 * Represents an active tenant for the watcher to service.
 */
type TenantInfo = {
  id: string;
  connection: SquadhubConnection;
};

/**
 * Get the list of active tenants to service.
 *
 * Queries Convex `tenants.listActive` for all active tenants
 * with their squadhub connection info.
 */
async function getActiveTenants(): Promise<TenantInfo[]> {
  const tenants = await convex.query(api.tenants.listActive, {
    watcherToken: config.watcherToken,
  });
  return tenants.map(
    (t: { id: string; squadhubUrl: string; squadhubToken: string }) => ({
      id: t.id,
      connection: {
        squadhubUrl: t.squadhubUrl,
        squadhubToken: t.squadhubToken,
      },
    }),
  );
}

const ROUTINE_CHECK_INTERVAL_MS = 10_000; // Check routines every 10 seconds

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check for due routines and trigger them for a single tenant.
 *
 * Uses a 1-hour window for crash tolerance: if a routine is scheduled
 * for 6:00 AM, it can trigger anytime between 6:00 AM and 6:59 AM.
 */
async function checkRoutinesForTenant(machineToken: string): Promise<void> {
  // Get tenant's timezone from tenant settings
  const timezone =
    (await convex.query(api.tenants.getTimezone, {
      machineToken,
    })) ?? DEFAULT_TIMEZONE;

  // Get current timestamp and time in user's timezone
  const now = new Date();
  const currentTimestamp = now.getTime();
  const { dayOfWeek, hour, minute } = getTimeInZone(now, timezone);

  // Query for due routines (with 1-hour window tolerance)
  const dueRoutines = await convex.query(api.routines.getDueRoutines, {
    machineToken,
    currentTimestamp,
    dayOfWeek,
    hour,
    minute,
  });

  // Trigger each due routine
  for (const routine of dueRoutines) {
    try {
      const taskId = await convex.mutation(api.routines.trigger, {
        machineToken,
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
}

/**
 * Check routines for all active tenants.
 */
async function checkRoutines(): Promise<void> {
  const tenants = await getActiveTenants();

  for (const tenant of tenants) {
    try {
      await checkRoutinesForTenant(tenant.connection.squadhubToken);
    } catch (err) {
      console.error(
        `[watcher] Error checking routines for tenant ${tenant.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
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
 * Deliver notifications to a single agent via the tenant's squadhub
 */
async function deliverToAgent(
  connection: SquadhubConnection,
  sessionKey: string,
): Promise<void> {
  const { squadhubToken: machineToken } = connection;

  try {
    // Get undelivered notifications for this agent
    const notifications = await convex.query(api.notifications.getUndelivered, {
      machineToken,
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

        // Try to deliver to agent session via tenant's squadhub
        const result = await sessionsSend(connection, sessionKey, message, 10);

        if (result.ok) {
          // Mark as delivered in Convex
          await convex.mutation(api.notifications.markDelivered, {
            machineToken,
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
 * Main delivery loop — iterates over all active tenants
 */
async function deliveryLoop(): Promise<void> {
  const tenants = await getActiveTenants();

  for (const tenant of tenants) {
    // Get all registered agents for this tenant from Convex
    const agents = await convex.query(api.agents.list, {
      machineToken: tenant.connection.squadhubToken,
    });

    for (const agent of agents) {
      if (agent.sessionKey) {
        await deliverToAgent(tenant.connection, agent.sessionKey);
      }
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
  console.log(`[watcher] Notification poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log(
    `[watcher] Routine check interval: ${ROUTINE_CHECK_INTERVAL_MS}ms\n`,
  );

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
