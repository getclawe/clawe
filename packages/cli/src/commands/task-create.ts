import { client } from "../client.js";
import { api } from "@clawe/backend";

interface TaskCreateOptions {
  assign?: string;
  by?: string;
  priority?: "low" | "normal" | "high" | "urgent";
}

export async function taskCreate(
  title: string,
  options: TaskCreateOptions,
): Promise<void> {
  const taskId = await client.mutation(api.tasks.create, {
    title,
    assigneeSessionKey: options.assign,
    createdBySessionKey: options.by,
    priority: options.priority,
  });

  console.log(`✅ Task created: ${taskId}`);
}
