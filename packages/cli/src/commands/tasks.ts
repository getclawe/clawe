import { query } from "../client.js";
import { api } from "@clawe/backend";

export async function tasks(sessionKey: string): Promise<void> {
  const taskList = await query(api.tasks.getForAgent, { sessionKey });

  if (taskList.length === 0) {
    console.log("No active tasks.");
    return;
  }

  console.log(`📋 ${taskList.length} active task(s):\n`);
  for (const task of taskList) {
    const priority = task.priority ? `[${task.priority}]` : "";
    console.log(`${priority} ${task.title}`);
    console.log(`   ID: ${task._id}`);
    console.log(`   Status: ${task.status}`);
    if (task.subtasks && task.subtasks.length > 0) {
      const done = task.subtasks.filter((s) => s.done).length;
      console.log(`   Subtasks: ${done}/${task.subtasks.length}`);
    }
    console.log();
  }
}
