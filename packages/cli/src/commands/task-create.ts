import { mutation } from "../client.js";
import { api } from "@clawe/backend";

interface TaskCreateOptions {
  assign?: string;
  by?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  description?: string;
}

export async function taskCreate(
  title: string,
  options: TaskCreateOptions,
): Promise<void> {
  const taskId = await mutation(api.tasks.create, {
    title,
    description: options.description,
    assigneeSessionKey: options.assign,
    createdBySessionKey: options.by,
    priority: options.priority,
  });

  console.log(`✅ Task created: ${taskId}`);
}
