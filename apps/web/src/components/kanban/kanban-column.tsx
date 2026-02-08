"use client";

import { Clock, CheckCircle2, Inbox, UserCheck, Eye } from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";
import { KanbanCard } from "./kanban-card";
import { columnVariants, type KanbanColumnDef, type KanbanTask } from "./types";
import { ScrollArea } from "@clawe/ui/components/scroll-area";

const columnIcons: Record<KanbanColumnDef["variant"], React.ReactNode> = {
  inbox: <Inbox className="h-3.5 w-3.5 text-gray-400" />,
  assigned: <UserCheck className="h-3.5 w-3.5 text-white" />,
  "in-progress": <Clock className="h-3.5 w-3.5 text-white" />,
  review: <Eye className="h-3.5 w-3.5 text-white" />,
  done: <CheckCircle2 className="h-3.5 w-3.5 text-white" />,
};

export type KanbanColumnProps = {
  column: KanbanColumnDef;
  onTaskClick: (task: KanbanTask) => void;
};

export const KanbanColumn = ({ column, onTaskClick }: KanbanColumnProps) => {
  const variant = columnVariants[column.variant];
  const icon = columnIcons[column.variant];

  return (
    <div
      className={cn(
        "flex h-full w-66 shrink-0 flex-col rounded-lg p-2",
        variant.column,
      )}
    >
      {/* Header */}
      <div className="mb-2 flex w-full items-center gap-2">
        <span
          className={cn(
            "flex flex-row items-center gap-2 rounded px-2 py-0.5 text-xs font-medium tracking-wide uppercase",
            variant.badge,
          )}
        >
          {icon}
          {column.title}
        </span>
        <span className="text-muted-foreground text-sm font-medium">
          {column.tasks.length}
        </span>
      </div>

      {/* Task list */}
      <ScrollArea className="min-h-0">
        <div className="space-y-2">
          {column.tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onTaskClick={onTaskClick} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
