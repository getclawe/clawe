"use client";

import {
  Inbox,
  CircleDot,
  Play,
  Eye,
  CircleCheck,
  Mail,
  Moon,
  Target,
} from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";
import { KanbanCard } from "./kanban-card";
import { columnVariants, type KanbanColumnDef, type KanbanTask } from "./types";
import { ScrollArea } from "@clawe/ui/components/scroll-area";

const columnIconComponents: Record<
  KanbanColumnDef["variant"],
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  inbox: Inbox,
  assigned: CircleDot,
  "in-progress": Play,
  review: Eye,
  done: CircleCheck,
};

const emptyStateIcons: Record<
  KanbanColumnDef["variant"],
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  inbox: Mail,
  assigned: Moon,
  "in-progress": Moon,
  review: Moon,
  done: Target,
};

const EmptyState = ({ variant }: { variant: KanbanColumnDef["variant"] }) => {
  const EmptyIcon = emptyStateIcons[variant];
  const variantStyles = columnVariants[variant];

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <EmptyIcon
        className={cn("h-8 w-8", variantStyles.icon, "opacity-70")}
        strokeWidth={1}
      />
      <span className="text-muted-foreground mt-2 text-sm">Empty</span>
    </div>
  );
};

export type KanbanColumnProps = {
  column: KanbanColumnDef;
  onTaskClick: (task: KanbanTask) => void;
};

export const KanbanColumn = ({ column, onTaskClick }: KanbanColumnProps) => {
  const variant = columnVariants[column.variant];
  const IconComponent = columnIconComponents[column.variant];

  return (
    <div
      className={cn(
        "flex h-full min-w-48 flex-1 flex-col rounded-lg p-2",
        variant.column,
      )}
    >
      {/* Header */}
      <div className="mb-2 flex w-full items-center gap-2">
        <IconComponent
          className={cn("h-4 w-4", variant.icon)}
          strokeWidth={2}
        />
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            variant.badge,
          )}
        >
          {column.title}
        </span>
        <span className="text-muted-foreground ml-auto text-sm font-medium">
          {column.tasks.length}
        </span>
      </div>

      {/* Task list */}
      <ScrollArea className="min-h-0 flex-1">
        {column.tasks.length === 0 ? (
          <EmptyState variant={column.variant} />
        ) : (
          <div className="space-y-2">
            {column.tasks.map((task) => (
              <KanbanCard key={task.id} task={task} onTaskClick={onTaskClick} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
