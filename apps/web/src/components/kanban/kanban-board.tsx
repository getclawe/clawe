"use client";

import { useState } from "react";
import { cn } from "@clawe/ui/lib/utils";
import { ScrollArea, ScrollBar } from "@clawe/ui/components/scroll-area";
import { KanbanColumn } from "./kanban-column";
import { TaskDetailModal } from "./task-detail-modal";
import type { KanbanBoardProps, KanbanTask } from "./types";

export const KanbanBoard = ({ columns, className }: KanbanBoardProps) => {
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);

  const handleTaskClick = (task: KanbanTask) => {
    setSelectedTask(task);
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setSelectedTask(null);
    }
  };

  return (
    <>
      <ScrollArea
        type="scroll"
        className={cn("h-full w-full", className)}
        data-kanban-board
      >
        <div className="flex h-full gap-2 pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <TaskDetailModal
        task={selectedTask}
        open={selectedTask !== null}
        onOpenChange={handleModalClose}
      />
    </>
  );
};
