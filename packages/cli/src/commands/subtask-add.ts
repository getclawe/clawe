import { mutation } from "../client.js";
import { api } from "@clawe/backend";
import type { Id } from "@clawe/backend/dataModel";

interface SubtaskAddOptions {
  assign?: string;
  description?: string;
}

export async function subtaskAdd(
  taskId: string,
  title: string,
  options: SubtaskAddOptions,
): Promise<void> {
  const index = await mutation(api.tasks.addSubtask, {
    taskId: taskId as Id<"tasks">,
    title,
    description: options.description,
    assigneeSessionKey: options.assign,
  });

  console.log(`✅ Added subtask at index ${index}: ${title}`);
}
