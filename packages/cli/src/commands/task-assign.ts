import { mutation } from "../client.js";
import { api } from "@clawe/backend";
import type { Id } from "@clawe/backend/dataModel";

interface TaskAssignOptions {
  by?: string;
}

export async function taskAssign(
  taskId: string,
  assigneeSessionKey: string,
  options: TaskAssignOptions,
): Promise<void> {
  await mutation(api.tasks.assign, {
    taskId: taskId as Id<"tasks">,
    assigneeSessionKeys: [assigneeSessionKey],
    bySessionKey: options.by,
  });

  console.log(`✅ Task assigned to ${assigneeSessionKey}`);
}
