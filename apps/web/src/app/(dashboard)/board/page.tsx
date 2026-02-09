"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@clawe/backend";
import type { TaskWithAssignees } from "@clawe/backend/types";
import { Bell } from "lucide-react";
import { Button } from "@clawe/ui/components/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@clawe/ui/components/resizable";
import {
  PageHeader,
  PageHeaderRow,
  PageHeaderTitle,
  PageHeaderActions,
} from "@dashboard/page-header";
import {
  KanbanBoard,
  type KanbanTask,
  type KanbanColumnDef,
} from "@/components/kanban";
import { LiveFeed, LiveFeedTitle } from "@/components/live-feed";
import { useDrawer } from "@/providers/drawer-provider";
import { AgentsPanel } from "./_components/agents-panel";

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
function mapTask(task: TaskWithAssignees): KanbanTask {
  const subtasks: KanbanTask[] =
    task.subtasks
      ?.filter((st) => !st.done)
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
    documentCount: task.documentCount,
  };
}

type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "done";

function isValidStatus(status: string): status is TaskStatus {
  return ["inbox", "assigned", "in_progress", "review", "done"].includes(
    status,
  );
}

// Panel sizes in pixels
const COLLAPSED_SIZE = "48px";
const DEFAULT_SIZE = "220px";
const MIN_SIZE = "180px"; // Must be > COLLAPSED_SIZE for expand to work
const MAX_SIZE = "280px";

const STORAGE_KEY = "board-agents-panel-collapsed";

// Get initial collapsed state from localStorage (runs once on module load)
const getInitialCollapsed = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
};

const BoardPage = () => {
  const { openDrawer } = useDrawer();
  const tasks = useQuery(api.tasks.list, {});
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed);

  // Filter tasks by selected agents
  const filteredTasks = tasks?.filter((task) => {
    // If no agents selected, show all tasks
    if (selectedAgentIds.length === 0) return true;
    // Show task if any of its assignees is selected
    return task.assignees?.some((a) => selectedAgentIds.includes(a._id));
  });

  // Group tasks by status
  const groupedTasks: Record<TaskStatus, KanbanTask[]> = {
    inbox: [],
    assigned: [],
    in_progress: [],
    review: [],
    done: [],
  };

  if (filteredTasks) {
    for (const task of filteredTasks) {
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
    { id: "done", title: "Done", variant: "done", tasks: groupedTasks.done },
  ];

  const handleOpenFeed = () => {
    openDrawer(<LiveFeed className="h-full" />, <LiveFeedTitle />);
  };

  const handlePanelResize = (size: {
    asPercentage: number;
    inPixels: number;
  }) => {
    // Panel is collapsed when size is at or near collapsedSize (48px)
    const collapsed = size.inPixels <= 60;
    setIsCollapsed(collapsed);
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  };

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      {/* Agents Panel */}
      <ResizablePanel
        defaultSize={isCollapsed ? COLLAPSED_SIZE : DEFAULT_SIZE}
        minSize={MIN_SIZE}
        maxSize={MAX_SIZE}
        collapsible
        collapsedSize={COLLAPSED_SIZE}
        onResize={handlePanelResize}
        className="hidden md:block"
      >
        <AgentsPanel
          collapsed={isCollapsed}
          selectedAgentIds={selectedAgentIds}
          onSelectionChange={setSelectedAgentIds}
        />
      </ResizablePanel>

      <ResizableHandle className="hover:bg-border hidden w-px bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:flex" />

      {/* Main Content */}
      <ResizablePanel minSize="400px">
        <div className="flex h-full flex-col p-6">
          <PageHeader className="mb-0">
            <PageHeaderRow>
              <PageHeaderTitle>Board</PageHeaderTitle>
              <PageHeaderActions>
                <Button variant="outline" size="sm" onClick={handleOpenFeed}>
                  <Bell className="mr-2 h-4 w-4" />
                  Live Feed
                </Button>
              </PageHeaderActions>
            </PageHeaderRow>
          </PageHeader>

          <div className="min-h-0 flex-1 overflow-hidden pt-6">
            <KanbanBoard columns={columns} className="h-full" />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default BoardPage;
