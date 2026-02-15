import { query } from "../client.js";
import { api } from "@clawe/backend";

interface FeedOptions {
  limit?: number;
}

export async function feed(options: FeedOptions): Promise<void> {
  const activities = await query(api.activities.feed, {
    limit: options.limit ?? 20,
  });

  if (activities.length === 0) {
    console.log("No recent activity.");
    return;
  }

  console.log("📜 Activity Feed:\n");
  for (const activity of activities) {
    const time = new Date(activity.createdAt).toLocaleTimeString();
    const agent = activity.agent?.name ?? "System";
    console.log(`[${time}] ${agent}: ${activity.message}`);
  }
}
