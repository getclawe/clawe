import { mutation } from "../client.js";
import { api } from "@clawe/backend";

interface TaskPlan {
  title: string;
  description: string;
  priority?: "low" | "normal" | "high" | "urgent";
  assignee?: string; // primary assignee session key
  by?: string; // creator session key
  subtasks: Array<{
    title: string;
    description?: string;
    assign?: string; // subtask assignee session key
  }>;
}

export async function taskPlan(planJson: string): Promise<void> {
  let plan: TaskPlan;

  try {
    plan = JSON.parse(planJson);
  } catch {
    console.error("Error: Invalid JSON. Expected a task plan object.");
    console.error("");
    console.error("Example:");
    console.error(
      JSON.stringify(
        {
          title: "Blog Post: Topic",
          description: "Write a 2000-word post about...",
          priority: "high",
          assignee: "agent:inky:main",
          by: "agent:main:main",
          subtasks: [
            { title: "Research topic", assign: "agent:scout:main" },
            { title: "Write first draft" },
            { title: "Create hero image", assign: "agent:pixel:main" },
          ],
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  // Validate required fields
  if (!plan.title) {
    console.error("Error: Plan must include 'title'");
    process.exit(1);
  }
  if (!plan.description) {
    console.error("Error: Plan must include 'description'");
    process.exit(1);
  }
  if (!plan.subtasks || plan.subtasks.length === 0) {
    console.error("Error: Plan must include at least one subtask");
    process.exit(1);
  }

  console.log(`📋 Creating task plan: ${plan.title}`);
  console.log(`   ${plan.subtasks.length} subtask(s)`);
  if (plan.assignee) console.log(`   Assigned to: ${plan.assignee}`);
  console.log("");

  try {
    const taskId = await mutation(api.tasks.createWithPlan, {
      title: plan.title,
      description: plan.description,
      priority: plan.priority,
      assigneeSessionKey: plan.assignee,
      createdBySessionKey: plan.by,
      subtasks: plan.subtasks.map((st) => ({
        title: st.title,
        description: st.description,
        assigneeSessionKey: st.assign,
      })),
    });

    console.log(`✅ Task planned: ${taskId}`);
    console.log("");
    console.log("Subtasks:");
    plan.subtasks.forEach((st, i) => {
      const assignLabel = st.assign ? ` → ${st.assign}` : "";
      console.log(`  ${i}. ${st.title}${assignLabel}`);
    });
    console.log("");
    console.log("Notifications sent to all assigned agents.");
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
