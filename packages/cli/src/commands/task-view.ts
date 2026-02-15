import { query } from "../client.js";
import { api } from "@clawe/backend";
import type { Id } from "@clawe/backend/dataModel";

export async function taskView(taskId: string): Promise<void> {
  const task = await query(api.tasks.get, {
    taskId: taskId as Id<"tasks">,
  });

  if (!task) {
    console.error(`Task not found: ${taskId}`);
    process.exit(1);
  }

  console.log(`📋 Task: ${task.title}`);
  console.log(`   ID: ${task._id}`);
  console.log(`   Status: ${task.status}`);
  console.log(`   Priority: ${task.priority || "normal"}`);
  console.log();

  if (task.description) {
    console.log(`📝 Description:`);
    console.log(task.description);
    console.log();
  }

  if (task.subtasks && task.subtasks.length > 0) {
    const done = task.subtasks.filter((s) => s.done).length;
    console.log(`📋 Subtasks (${done}/${task.subtasks.length}):`);
    task.subtasks.forEach(
      (
        st: {
          done: boolean;
          title: string;
          status?: string;
          blockedReason?: string;
          assignee?: { emoji?: string; name: string } | null;
        },
        i: number,
      ) => {
        const status = st.status ?? (st.done ? "done" : "pending");
        const icons: Record<string, string> = {
          done: "✅",
          in_progress: "🔄",
          blocked: "🚫",
          pending: "⬜",
        };
        const icon = icons[status] || "⬜";
        const assignee = st.assignee
          ? ` → ${st.assignee.emoji || ""} ${st.assignee.name}`
          : "";
        const blocked =
          status === "blocked" && st.blockedReason
            ? ` (${st.blockedReason})`
            : "";
        console.log(`   ${i}. ${icon} ${st.title}${assignee}${blocked}`);
      },
    );
    console.log();
  }

  if (task.deliverables && task.deliverables.length > 0) {
    console.log(`📦 Deliverables (${task.deliverables.length}):`);
    for (const d of task.deliverables) {
      console.log(`   - ${d.title}: ${d.path}`);
    }
    console.log();
  }

  if (task.messages && task.messages.length > 0) {
    console.log(`💬 Comments (${task.messages.length}):`);
    for (const m of task.messages) {
      const author = m.author?.name ?? "Unknown";
      const date = new Date(m.createdAt).toLocaleString();
      console.log(
        `   [${date}] ${author}: ${m.content.slice(0, 100)}${m.content.length > 100 ? "..." : ""}`,
      );
    }
  }
}
