"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  AlignLeft,
  User,
  FileText,
} from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@clawe/ui/components/popover";
import type { KanbanTask } from "./types";
import { Button } from "@clawe/ui/components/button";

export type KanbanCardProps = {
  task: KanbanTask;
  onTaskClick: (task: KanbanTask) => void;
  isSubtask?: boolean;
  parentTitle?: string;
};

const priorityStyles = {
  high: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  medium:
    "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export const KanbanCard = ({
  task,
  onTaskClick,
  isSubtask = false,
  parentTitle,
}: KanbanCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const hasSubtasks = task.subtasks.length > 0;
  const showMetadata = task.priority === "high" || task.assignee;

  const handleCardClick = () => {
    onTaskClick(task);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div className="w-full">
      <div
        onClick={handleCardClick}
        className="bg-background cursor-pointer overflow-hidden rounded-lg border border-gray-900/10 p-3 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        {/* Parent title for subtasks */}
        {isSubtask && parentTitle && (
          <p className="mb-1 truncate text-xs text-gray-400">{parentTitle}</p>
        )}

        {/* Title */}
        <h3 className="text-sm leading-snug font-medium text-gray-900 dark:text-gray-100">
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <div className="mt-2">
            <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
              {task.description}
            </p>
          </div>
        )}

        {/* Metadata row: popover button on left, priority & assignee on right */}
        {(task.description || showMetadata) && (
          <div className="mt-1.5 flex items-center justify-between">
            {task.description ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hover:bg-muted h-fit w-0 p-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <AlignLeft className="h-4 w-4 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="right"
                  align="center"
                  className="w-80 bg-white dark:bg-zinc-900"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {task.description}
                  </p>
                </PopoverContent>
              </Popover>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {task.priority === "high" && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                    priorityStyles[task.priority],
                  )}
                >
                  {task.priority}
                </span>
              )}

              {task.assignee && (
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <User className="h-3 w-3" />
                  {task.assignee}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Subtask toggle and document badge */}
        {(hasSubtasks || (task.documentCount && task.documentCount > 0)) &&
          !isSubtask && (
            <div className="mt-3 flex items-center gap-3">
              {hasSubtasks && (
                <Button
                  variant="ghost"
                  onClick={handleToggleClick}
                  className="h-auto gap-1 p-1 px-1.5! text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {expanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {task.subtasks.length} subtask
                  {task.subtasks.length !== 1 && "s"}
                </Button>
              )}

              {task.documentCount && task.documentCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <FileText className="h-3 w-3" />
                  {task.documentCount} document
                  {task.documentCount !== 1 && "s"}
                </span>
              )}
            </div>
          )}
      </div>

      {/* Expanded subtasks */}
      {expanded && hasSubtasks && (
        <div className="mt-2 ml-3 space-y-2">
          {task.subtasks.map((subtask) => (
            <KanbanCard
              key={subtask.id}
              task={subtask}
              onTaskClick={onTaskClick}
              isSubtask
              parentTitle={task.title}
            />
          ))}
        </div>
      )}
    </div>
  );
};
