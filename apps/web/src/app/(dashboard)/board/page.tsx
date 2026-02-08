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
import { LiveFeed } from "@/components/live-feed";

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
  const subtasks: KanbanTask[] =
    task.subtasks
      ?.filter((st) => !st.done) // Only show incomplete subtasks
      .map((st, i) => ({
        id: `${task._id}-${i}`,
        title: st.title,
        description: st.description,
        priority: "medium",
        subtasks: [],
      })) || [];

  return {
    id: task._id,
    title: task.title,
    description: task.description,
    priority: mapPriority(task.priority),
    assignee: task.assignees?.[0]
      ? `${task.assignees[0].emoji || ""} ${task.assignees[0].name}`.trim()
      : undefined,
    subtasks,
  };
}

type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "done";

function isValidStatus(status: string): status is TaskStatus {
  return ["inbox", "assigned", "in_progress", "review", "done"].includes(
    status,
  );
}

const BoardPage = () => {
  const tasks = useQuery(api.tasks.list, {});

  // Group tasks by status
  const groupedTasks: Record<TaskStatus, KanbanTask[]> = {
    inbox: [],
    assigned: [],
    in_progress: [],
    review: [],
    done: [],
  };

  // Add real tasks from Convex
  if (tasks) {
    for (const task of tasks) {
      if (isValidStatus(task.status)) {
        groupedTasks[task.status].push(mapTask(task));
      }
    }
  }

  const columns: KanbanColumnDef[] = [
    {
      id: "inbox",
      title: "Inbox",
      variant: "inbox",
      tasks: groupedTasks.inbox,
    },
    {
      id: "assigned",
      title: "Assigned",
      variant: "assigned",
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
      variant: "review",
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
      <PageHeader className="mb-0">
        <PageHeaderRow>
          <PageHeaderTitle>Board</PageHeaderTitle>
        </PageHeaderRow>
      </PageHeader>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Kanban Board */}
        <div className="min-w-0 flex-1 pt-6">
          <KanbanBoard columns={columns} className="h-full" />
        </div>

        {/* Live Feed Sidebar */}
        <div className="bg-muted/30 hidden h-full w-80 shrink-0 overflow-hidden border-l lg:block">
          <LiveFeed className="h-full" />
        </div>
      </div>
    </>
  );
};

export default BoardPage;
