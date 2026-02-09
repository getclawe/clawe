// Kanban's own task type (isolated from Convex)
export type KanbanTask = {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  assignee?: string;
  subtasks: KanbanTask[];
  documentCount?: number;
};

// Predefined column variants with built-in styling
export type ColumnVariant =
  | "inbox"
  | "assigned"
  | "in-progress"
  | "review"
  | "done";

export type KanbanColumnDef = {
  id: string;
  title: string;
  variant: ColumnVariant;
  tasks: KanbanTask[];
};

export type KanbanBoardProps = {
  columns: KanbanColumnDef[];
  className?: string;
};

// Variant styles (used internally by KanbanColumn)
export const columnVariants: Record<
  ColumnVariant,
  { badge: string; column: string; icon: string }
> = {
  inbox: {
    badge: "bg-gray-800 text-white dark:bg-gray-700",
    column: "bg-rose-50/50 dark:bg-rose-950/20",
    icon: "text-gray-600 dark:text-gray-400",
  },
  assigned: {
    badge: "bg-gray-800 text-white dark:bg-gray-700",
    column: "bg-orange-50/50 dark:bg-orange-950/20",
    icon: "text-gray-600 dark:text-gray-400",
  },
  "in-progress": {
    badge: "bg-gray-800 text-white dark:bg-gray-700",
    column: "bg-blue-50/50 dark:bg-blue-950/20",
    icon: "text-gray-600 dark:text-gray-400",
  },
  review: {
    badge: "bg-gray-800 text-white dark:bg-gray-700",
    column: "bg-purple-50/50 dark:bg-purple-950/20",
    icon: "text-gray-600 dark:text-gray-400",
  },
  done: {
    badge: "bg-gray-800 text-white dark:bg-gray-700",
    column: "bg-green-50/50 dark:bg-green-950/20",
    icon: "text-gray-600 dark:text-gray-400",
  },
};
