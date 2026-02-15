# Web App

Next.js 16 with App Router.

## Commands

```bash
pnpm dev          # Dev server on port 3000
pnpm build        # Production build
pnpm check-types  # TypeScript check
```

## Structure

```
src/app/                              # App Router pages
src/app/api/                          # API routes (health, webhooks, integrations)
src/app/(dashboard)/                  # Dashboard routes (layout group)
src/app/(dashboard)/_components/      # Dashboard-wide components (use @dashboard/ alias)
src/components/                       # Global shared components
src/hooks/                            # Custom React hooks
src/providers/                        # Context providers (Convex, Query, Theme)
```

**Path aliases:**

- `@/*` → `src/*`
- `@dashboard/*` → `src/app/(dashboard)/_components/*`

## Data Fetching

### Convex (Core Data - Real-time)

Use for agents, tasks, messages - data that needs real-time sync:

```tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@clawe/backend";

const agents = useQuery(api.agents.list); // Real-time subscribed
const createAgent = useMutation(api.agents.create);
```

- `useQuery` returns `undefined` while loading
- Data updates automatically - no cache invalidation needed

### React Query (External APIs)

Use for external service calls:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";

const { data } = useQuery({
  queryKey: ["external-data"],
  queryFn: () => fetch("https://api.example.com/data").then((r) => r.json()),
});
```

## Types

Document types come from Convex. Use `Doc<"tableName">` from the generated types:

```tsx
import type { Doc } from "@clawe/backend/server";

type Task = Doc<"tasks">;
type Agent = Doc<"agents">;
type Message = Doc<"messages">;
```

Or infer from query results (preferred when using the data directly).

**Environment variables:**

- `NEXT_PUBLIC_CONVEX_URL` → Convex deployment URL (required)
- `ANTHROPIC_API_KEY` → Anthropic API key (passed to squadhub container)
- `SQUADHUB_URL` → SquadHub gateway URL
- `SQUADHUB_TOKEN` → SquadHub authentication token (from root `.env`)

## Adding Routes

1. Create `app/(dashboard)/route-name/page.tsx`
2. Add nav item in `_components/dashboard-sidebar.tsx`:
   ```tsx
   { title: "Name", url: "/route-name", icon: IconName }
   ```

## Patterns

- Write clean, readable code - prioritize clarity over cleverness
- Extract reusable components when patterns repeat
- **Use strong typing** - use generic types from libraries (`useState<T>`); avoid `any` and `as` casts
- **Use shadcn Tooltip, not native `title`** - for hover hints, use `@clawe/ui/components/tooltip`
- Route groups: `(dashboard)/emails/` → URL is `/emails`
- Server components by default, add `"use client"` only when needed (required for Convex hooks)
- Pages export `default function`
- Content scrolls in ScrollArea, header stays fixed
- **Use hooks for side effects, not components** - never create components that return `null` just to run an effect; use a custom hook instead
- **Convex data** - no manual cache invalidation needed, data syncs automatically
- **React Query cache** - use `invalidateQueries` after mutations for API calls
- **Use React Query + axios** - for API calls, use `useQuery`/`useMutation` with `axios`; place API functions in `lib/api/`
- **Button loading states** - replace icon with `<Spinner />` from `@clawe/ui/components/spinner`, update text (e.g., "Creating..."), and disable
- **Conditional classNames** - always use `cn()` for merging classes: `cn(baseStyles, { "conditional-class": condition })`
- **Verify library APIs are current** - check official docs for deprecated/legacy patterns before implementing

## Component Structure

- **One component per file** - never put multiple components in the same file (includes page.tsx)
- **Page-specific components** - create `_components/` subdirectory in the route folder:
  ```
  app/(dashboard)/agents/
  ├── page.tsx
  └── _components/
      ├── agents-list.tsx
      ├── agent-card.tsx
      └── empty-state.tsx
  ```
- **Use const arrow functions** for components, not function declarations:

  ```tsx
  // ✓ Correct
  export const MyComponent = ({ ... }: Props) => { ... };

  // ✗ Incorrect
  export function MyComponent({ ... }) { ... }
  ```

- **Props typing** - use base types directly, only create named interface when adding custom props:

  ```tsx
  // ✓ No custom props - use base type directly
  export const PageHeader = ({
    className,
    children,
    ...props
  }: React.ComponentProps<"div">) => { ... };

  // ✓ Custom props - create interface
  export interface PageHeaderTabProps extends React.ComponentProps<"button"> {
    active?: boolean;
  }

  export const PageHeaderTab = ({ active, ...props }: PageHeaderTabProps) => { ... };

  // ✗ Don't create empty type aliases
  export type PageHeaderProps = React.ComponentProps<"div">;
  ```

- **Multi-component features**: Create a directory with an `index.ts` barrel export
  ```
  app/(dashboard)/_components/page-header/
  ├── page-header.tsx
  ├── page-header-row.tsx
  ├── page-header-title.tsx
  └── index.ts          # Re-exports all components
  ```
  Import with: `import { PageHeader } from "@dashboard/page-header"`

## Active Nav Styling

```
Light: text-pink-600, hover bg-pink-600/5
Dark:  text-pink-400, hover bg-pink-400/5
```

## Testing

**Convention:** Test files live alongside implementation files.

```
src/
├── lib/
│   └── squadhub/
│       ├── client.ts
│       ├── client.spec.ts      # Unit tests for client
│       ├── actions.ts
│       └── actions.spec.ts     # Tests for server actions
├── hooks/
│   ├── use-something.ts
│   └── use-something.spec.ts   # Hook tests
└── app/
    └── (dashboard)/
        └── board/
            └── _components/
                ├── task-card.tsx
                └── task-card.spec.tsx  # Component tests
```

### What to Test

| Type              | Test With                | Example              |
| ----------------- | ------------------------ | -------------------- |
| Utility functions | Vitest                   | `formatDate.spec.ts` |
| React hooks       | `@testing-library/react` | `use-board.spec.ts`  |
| Components        | `@testing-library/react` | `task-card.spec.tsx` |
| Server actions    | Vitest + mocks           | `actions.spec.ts`    |
| API routes        | Vitest + fetch mocks     | `route.spec.ts`      |

### Component Test Example

```tsx
// task-card.spec.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskCard } from "./task-card";

describe("TaskCard", () => {
  it("renders task title", () => {
    render(<TaskCard title="My Task" status="pending" />);
    expect(screen.getByText("My Task")).toBeInTheDocument();
  });

  it("shows completed state", () => {
    render(<TaskCard title="Done" status="completed" />);
    expect(screen.getByRole("article")).toHaveClass("opacity-50");
  });
});
```

### Hook Test Example

```tsx
// use-board.spec.ts
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBoard } from "./use-board";

describe("useBoard", () => {
  it("initializes with empty tasks", () => {
    const { result } = renderHook(() => useBoard());
    expect(result.current.tasks).toEqual([]);
  });
});
```

### Server Action Test Example

```typescript
// actions.spec.ts
import { describe, it, expect, vi } from "vitest";
import { saveAnthropicApiKey } from "./actions";

vi.mock("./client", () => ({
  patchConfig: vi.fn().mockResolvedValue({ ok: true, result: {} }),
}));

describe("saveAnthropicApiKey", () => {
  it("patches config with API key", async () => {
    const result = await saveAnthropicApiKey("sk-test");
    expect(result.ok).toBe(true);
  });
});
```

### Commands

```bash
pnpm test              # Run tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
pnpm test -- path/to   # Run specific test file
```
