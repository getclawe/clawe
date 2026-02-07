import { client } from "../client.js";
import { api } from "@clawe/backend";

export async function check(sessionKey: string): Promise<void> {
  // Record heartbeat
  await client.mutation(api.agents.heartbeat, { sessionKey });

  // Get undelivered notifications
  const notifications = await client.query(api.notifications.getUndelivered, {
    sessionKey,
  });

  if (notifications.length === 0) {
    console.log("HEARTBEAT_OK");
    return;
  }

  // Mark as delivered
  await client.mutation(api.notifications.markDelivered, {
    notificationIds: notifications.map((n) => n._id),
  });

  // Output notifications
  console.log(`📬 ${notifications.length} notification(s):\n`);
  for (const n of notifications) {
    const from = n.sourceAgent?.name ?? "System";
    console.log(`[${n.type}] from ${from}: ${n.content}`);
    if (n.task) {
      console.log(`   Task: "${n.task.title}" (${n.task.status})`);
    }
    console.log();
  }
}
