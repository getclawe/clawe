"use client";

import { useQuery } from "convex/react";
import { api } from "@clawe/backend";
import {
  PageHeader,
  PageHeaderRow,
  PageHeaderTitle,
} from "@dashboard/page-header";
import {
  KanbanBoard,
  type KanbanTask,
  type KanbanColumnDef,
} from "@/components/kanban";

// Map priority from Convex to Kanban format
function mapPriority(priority?: string): "low" | "medium" | "high" {
  switch (priority) {
    case "urgent":
    case "high":
      return "high";
    case "low":
      return "low";
    default:
      return "medium";
  }
}

// Map Convex task to Kanban task format
function mapTask(task: {
  _id: string;
  title: string;
  description?: string;
  priority?: string;
  assignees?: { name: string; emoji?: string }[];
  subtasks?: { title: string; description?: string; done: boolean }[];
}): KanbanTask {
  return {
    id: task._id,
    title: task.title,
    description: task.description,
    priority: mapPriority(task.priority),
    assignee: task.assignees?.[0]
      ? `${task.assignees[0].emoji || ""} ${task.assignees[0].name}`.trim()
      : undefined,
    subtasks:
      task.subtasks
        ?.filter((st) => !st.done) // Only show incomplete subtasks
        .map((st, i) => ({
          id: `${task._id}-${i}`,
          title: st.title,
          description: st.description,
          priority: "medium" as const,
          subtasks: [],
        })) || [],
  };
}

const BoardPage = () => {
  const tasks = useQuery(api.tasks.list, {});

  // Group tasks by status
  const groupedTasks = {
    inbox: [] as KanbanTask[],
    assigned: [] as KanbanTask[],
    in_progress: [] as KanbanTask[],
    review: [] as KanbanTask[],
    done: [] as KanbanTask[],
  };

  if (tasks) {
    for (const task of tasks) {
      const status = task.status as keyof typeof groupedTasks;
      if (groupedTasks[status]) {
        groupedTasks[status].push(mapTask(task));
      }
    }
  }

  const columns: KanbanColumnDef[] = [
    {
      id: "inbox",
      title: "Inbox",
      variant: "todo",
      tasks: groupedTasks.inbox,
    },
    {
      id: "assigned",
      title: "Assigned",
      variant: "todo",
      tasks: groupedTasks.assigned,
    },
    {
      id: "in_progress",
      title: "In Progress",
      variant: "in-progress",
      tasks: groupedTasks.in_progress,
    },
    {
      id: "review",
      title: "Review",
      variant: "in-review",
      tasks: groupedTasks.review,
    },
    {
      id: "done",
      title: "Done",
      variant: "done",
      tasks: groupedTasks.done,
    },
  ];

  return (
    <>
      <PageHeader>
        <PageHeaderRow>
          <PageHeaderTitle>Board</PageHeaderTitle>
        </PageHeaderRow>
      </PageHeader>

      <div className="min-h-0 flex-1">
        {!tasks ? (
          <div className="text-muted-foreground flex items-center justify-center p-8">
            Loading...
          </div>
        ) : (
          <KanbanBoard columns={columns} className="h-full" />
        )}
      </div>
    </>
  );
};

export default BoardPage;
