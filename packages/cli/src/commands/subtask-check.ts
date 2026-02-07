import { client } from "../client.js";
import { api } from "@clawe/backend";
import type { Id } from "@clawe/backend/dataModel";

interface SubtaskCheckOptions {
  by?: string;
}

export async function subtaskCheck(
  taskId: string,
  index: string,
  options: SubtaskCheckOptions,
): Promise<void> {
  await client.mutation(api.tasks.updateSubtask, {
    taskId: taskId as Id<"tasks">,
    subtaskIndex: parseInt(index, 10),
    done: true,
    bySessionKey: options.by,
  });

  console.log(`✅ Subtask ${index} marked as done`);
}

export async function subtaskUncheck(
  taskId: string,
  index: string,
  options: SubtaskCheckOptions,
): Promise<void> {
  await client.mutation(api.tasks.updateSubtask, {
    taskId: taskId as Id<"tasks">,
    subtaskIndex: parseInt(index, 10),
    done: false,
    bySessionKey: options.by,
  });

  console.log(`✅ Subtask ${index} marked as not done`);
}
