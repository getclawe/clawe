import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL environment variable is required");
  process.exit(1);
}

export const client = new ConvexHttpClient(CONVEX_URL);
