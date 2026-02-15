import { mutation } from "../client.js";
import { api } from "@clawe/backend";

interface AgentRegisterOptions {
  emoji?: string;
}

export async function agentRegister(
  name: string,
  role: string,
  sessionKey: string,
  options: AgentRegisterOptions,
): Promise<void> {
  const agentId = await mutation(api.agents.upsert, {
    name,
    role,
    sessionKey,
    emoji: options.emoji,
  });

  console.log(`✅ Agent registered: ${name} (${agentId})`);
}
