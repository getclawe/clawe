// Watcher configuration

export const POLL_INTERVAL_MS = 2000; // Check every 2 seconds

// Environment validation
export function validateEnv(): void {
  const required = ["CONVEX_URL", "OPENCLAW_URL", "OPENCLAW_TOKEN"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
    process.exit(1);
  }
}

export const config = {
  convexUrl: process.env.CONVEX_URL || "",
  openclawUrl: process.env.OPENCLAW_URL || "http://localhost:18789",
  openclawToken: process.env.OPENCLAW_TOKEN || "",
  pollIntervalMs: POLL_INTERVAL_MS,
};
