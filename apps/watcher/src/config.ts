// Watcher configuration

import { logger } from "./logger.js";

export const POLL_INTERVAL_MS = 2000; // Check every 2 seconds

// Environment validation
export function validateEnv(): void {
  const required = ["CONVEX_URL", "WATCHER_TOKEN"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.fatal({ missing }, "Missing required environment variables");
    process.exit(1);
  }
}

export const config = {
  convexUrl: process.env.CONVEX_URL || "",
  watcherToken: process.env.WATCHER_TOKEN || "",
  pollIntervalMs: POLL_INTERVAL_MS,
};
