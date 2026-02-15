import { mutation } from "../client.js";
import { api } from "@clawe/backend";
import type { Id } from "@clawe/backend/dataModel";

interface TaskCommentOptions {
  by?: string;
}

export async function taskComment(
  taskId: string,
  message: string,
  options: TaskCommentOptions,
): Promise<void> {
  await mutation(api.tasks.addComment, {
    taskId: taskId as Id<"tasks">,
    content: message,
    bySessionKey: options.by,
  });

  console.log("✅ Comment added");
}
