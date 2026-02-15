import { mutation } from "../client.js";
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
  await mutation(api.tasks.updateSubtask, {
    taskId: taskId as Id<"tasks">,
    subtaskIndex: parseInt(index, 10),
    done: true,
    status: "done",
    bySessionKey: options.by,
  });

  console.log(`✅ Subtask ${index} marked as done`);
}

export async function subtaskUncheck(
  taskId: string,
  index: string,
  options: SubtaskCheckOptions,
): Promise<void> {
  await mutation(api.tasks.updateSubtask, {
    taskId: taskId as Id<"tasks">,
    subtaskIndex: parseInt(index, 10),
    done: false,
    status: "pending",
    bySessionKey: options.by,
  });

  console.log(`✅ Subtask ${index} marked as pending`);
}

interface SubtaskBlockOptions {
  by?: string;
  reason?: string;
}

export async function subtaskBlock(
  taskId: string,
  index: string,
  options: SubtaskBlockOptions,
): Promise<void> {
  await mutation(api.tasks.updateSubtask, {
    taskId: taskId as Id<"tasks">,
    subtaskIndex: parseInt(index, 10),
    status: "blocked",
    blockedReason: options.reason,
    bySessionKey: options.by,
  });

  console.log(
    `⚠️ Subtask ${index} marked as blocked${options.reason ? `: ${options.reason}` : ""}`,
  );
}

interface SubtaskProgressOptions {
  by?: string;
}

export async function subtaskProgress(
  taskId: string,
  index: string,
  options: SubtaskProgressOptions,
): Promise<void> {
  await mutation(api.tasks.updateSubtask, {
    taskId: taskId as Id<"tasks">,
    subtaskIndex: parseInt(index, 10),
    status: "in_progress",
    bySessionKey: options.by,
  });

  console.log(`🔄 Subtask ${index} marked as in progress`);
}
