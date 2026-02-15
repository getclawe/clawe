import { query } from "../client.js";
import { api } from "@clawe/backend";
import { deriveStatus } from "@clawe/shared/agents";

export async function squad(): Promise<void> {
  const agents = await query(api.agents.squad, {});

  console.log("🤖 Squad Status:\n");
  for (const agent of agents) {
    const emoji = agent.emoji ?? "🤖";
    const status = deriveStatus(agent);
    const statusIcon = status === "online" ? "🟢" : "🔴";

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
