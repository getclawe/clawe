# Clawe

Open-source orchestration layer for OpenClaw - makes multi-agent AI systems accessible to everyone.

## Commands

```bash
pnpm dev          # Start development
pnpm convex:dev   # Start Convex dev server
pnpm build        # Build all
pnpm check        # Lint + types + format
pnpm fix          # Auto-fix lint + format
```

## Structure

```
convex/                    # Convex backend (schema, queries, mutations)
apps/web/                  # Next.js 16 app (App Router)
  └── src/app/api/         # API routes (health, webhooks, integrations)
packages/shared/           # Shared DTOs (Agent, Task, Message types)
packages/ui/               # Shared components (shadcn/ui)
packages/eslint-config/
packages/typescript-config/
```

## Data Layer

**Convex** - Real-time backend for core data (agents, tasks, messages):

```tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const agents = useQuery(api.agents.list);
const createAgent = useMutation(api.agents.create);
```

**Next.js API Routes** - For webhooks and external integrations (`/api/*`):

```typescript
// app/api/health/route.ts
import { NextResponse } from "next/server";

export const GET = () => {
  return NextResponse.json({ status: "ok" });
};
```

Core models: `agents`, `tasks`, `messages` (see `convex/schema.ts`)

## Environment Variables

- `OPENCLAW_TOKEN`: Authentication token for OpenClaw (required)
- `OPENCLAW_URL`: OpenClaw gateway URL (set in `.env.development` / `.env.production`)
- `NODE_ENV`: local (`development`) vs deployed (`production`) — controls dev tooling
- `ENVIRONMENT`: deployment target (`dev` / `prod`) — controls feature flags

Note: Convex URL is configured at runtime via the `/setup/convex` onboarding page.

## Code Style

- Write clean, readable code that humans can understand
- Prefer reusable components and functions over duplication
- Keep it simple - avoid over-engineering and premature abstractions
- **Use strong typing** - leverage types from external packages; avoid `any` and type assertions
- Prefer named exports over default exports (except Next.js pages/layouts where required)
- Use `@clawe/ui/components/*` for UI imports
- Use `@/` alias for app-local imports
- Use `cn()` for class merging
- Mark client components with `"use client"`
- Prefer Tailwind utilities over custom CSS

## IMPORTANT: shadcn/ui Components

Components in `packages/ui/src/components/` are from shadcn/ui.

**Allowed:**

- Adding new variants/sizes to CVA definitions
- Customizing via `className` when using components
- Wrapping in your own component

**NOT Allowed:**

- Changing existing variant styles
- Modifying component structure or logic
- Removing existing functionality

```tsx
// ✓ Add new variant to buttonVariants
brand: "bg-brand text-brand-foreground hover:bg-brand/90"

// ✓ Customize via className
<Button className="w-full" />

// ✗ Don't change existing variants or component logic
```

When adding components, use shadcn CLI or copy from ui.shadcn.com.

## Dependencies

- Use Radix UI only through shadcn/ui, never import directly
- Check shadcn for components before adding dependencies
- Keep bundle size small - prefer lightweight alternatives

## Testing

**Convention:** Every implementation file should have a corresponding test file.

```
file.ts       → file.spec.ts
file.tsx      → file.spec.tsx
component.tsx → component.spec.tsx
```

**When to write tests:**

- New utility functions → unit tests
- New hooks → hook tests with `@testing-library/react`
- New API routes → integration tests
- New Convex functions → Convex test utilities
- Complex business logic → unit tests
- Bug fixes → regression test first

**Test structure:**

```typescript
// utils/format.spec.ts
import { describe, it, expect } from "vitest";
import { formatDate } from "./format";

describe("formatDate", () => {
  it("formats ISO date to readable string", () => {
    expect(formatDate("2024-01-15")).toBe("Jan 15, 2024");
  });

  it("handles invalid input gracefully", () => {
    expect(formatDate("invalid")).toBe("Invalid date");
  });
});
```

**Commands:**

```bash
pnpm test           # Run all tests
pnpm test:watch     # Watch mode
pnpm test:coverage  # Coverage report
```

## Design

- Accent: `pink-600` (light), `pink-400` (dark)
- Clean, minimal, dashboard aesthetic for agent monitoring
- Mobile-first responsive
