import { mutation } from "../client.js";
import { api } from "@clawe/backend";
import type { Id } from "@clawe/backend/dataModel";

type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "done";

interface TaskStatusOptions {
  by?: string;
}

export async function taskStatus(
  taskId: string,
  status: string,
  options: TaskStatusOptions,
): Promise<void> {
  const validStatuses: TaskStatus[] = [
    "inbox",
    "assigned",
    "in_progress",
    "review",
    "done",
  ];

  if (!validStatuses.includes(status as TaskStatus)) {
    console.error(`Invalid status: ${status}`);
    console.error(`Valid statuses: ${validStatuses.join(", ")}`);
    process.exit(1);
  }

  await mutation(api.tasks.updateStatus, {
    taskId: taskId as Id<"tasks">,
    status: status as TaskStatus,
    bySessionKey: options.by,
  });

  console.log(`✅ Task status updated to: ${status}`);
}
