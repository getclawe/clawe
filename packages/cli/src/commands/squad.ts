import { client } from "../client.js";
import { api } from "@clawe/backend";

export async function squad(): Promise<void> {
  const agents = await client.query(api.agents.squad, {});

  console.log("🤖 Squad Status:\n");
  for (const agent of agents) {
    const emoji = agent.emoji ?? "🤖";
    const status = agent.status ?? "unknown";
    const statusIcon =
      status === "active" ? "🟢" : status === "idle" ? "⚪" : "🔴";

    console.log(`${emoji} ${agent.name} (${agent.role})`);
    console.log(`   Status: ${statusIcon} ${status}`);
    console.log(`   Session: ${agent.sessionKey}`);

    if (agent.currentTask) {
      console.log(`   Working on: ${agent.currentTask.title}`);
    }

    if (agent.lastHeartbeat) {
      const lastSeen = new Date(agent.lastHeartbeat).toLocaleString();
      console.log(`   Last seen: ${lastSeen}`);
    }

    console.log();
  }
}
