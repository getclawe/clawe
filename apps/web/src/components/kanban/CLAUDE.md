# Kanban Component

Display-only task kanban board with subtask support.

## Structure

- `kanban-board.tsx` - Main container, renders columns horizontally
- `kanban-column.tsx` - Single column with header and task cards
- `kanban-card.tsx` - Task card with subtask expansion
- `task-detail-modal.tsx` - Modal showing task details
- `types.ts` - Kanban-specific types (isolated from Convex)
- `index.ts` - Barrel exports

## Usage

```tsx
import { KanbanBoard, type KanbanTask, type KanbanColumnDef } from "@/components/kanban";

const columns: KanbanColumnDef[] = [
  { id: "inbox", title: "Inbox", variant: "inbox", tasks: [...] },
  { id: "assigned", title: "Assigned", variant: "assigned", tasks: [...] },
  { id: "in_progress", title: "In Progress", variant: "in-progress", tasks: [...] },
  { id: "review", title: "Review", variant: "review", tasks: [...] },
  { id: "done", title: "Done", variant: "done", tasks: [...] },
];

<KanbanBoard columns={columns} />
```

## Types

Component has its own types - isolated from Convex. Consumer maps data to `KanbanTask`.

## Conventions

- Use `cn()` for class merging
- Use shadcn Dialog for modal
- Display only - no editing capabilities
- Subtasks nested in `KanbanTask.subtasks`
