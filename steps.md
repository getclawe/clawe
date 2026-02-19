# Clawe Cloud Deployment Plan

## Goal

Deploy Clawe as a multi-tenant SaaS on AWS, where each user signs up, provides their Anthropic API key, and gets their own squadhub service. All infrastructure managed via CDK with full dev/prod environment separation.

## Architecture Overview

```
  Users (browser)
       │
       ▼
  ┌──────────┐     ┌────────────┐     ┌──────────┐
  │ Route 53 │────▶│ CloudFront │────▶│   ALB    │
  └──────────┘     └────────────┘     └────┬─────┘
                                           │
                              ┌─────────────▼──────────────┐
                              │  clawe-cluster-{env}       │
                              │  ┌────────────────────┐    │
                              │  │  Web App (Fargate)  │    │
                              │  │  Shared, all tenants│    │
                              │  └───┬────────────────┘    │
                              │      │                      │
                              │  ┌───▼────────────────┐    │
                              │  │  Watcher (Fargate)  │    │
                              │  │  Shared, polls all  │    │
                              │  └───┬────────────────┘    │
                              └──────┼──────────────────────┘
                                     │
                    ┌────────────────┐│┌────────────────┐
                    │                │││                │
                    ▼                ▼│▼                ▼
              ┌───────────┐    ┌─────▼─────────────────────┐
              │  Convex   │    │  clawe-squadhubs-{env}    │
              │ (Managed) │    │  ┌────────┐ ┌────────┐    │
              │ Multi-    │    │  │SH 1    │ │SH 2    │... │
              │ tenant    │    │  │Tenant A│ │Tenant B│    │
              └───────────┘    │  └───┬────┘ └───┬────┘    │
                               └──────┼──────────┼─────────┘
                                      │          │
                      ┌───────────────▼──────────▼──┐
                      │         EFS                  │
                      │  ┌──────────┐ ┌──────────┐  │
                      │  │/tenant-A │ │/tenant-B │  │
                      │  └──────────┘ └──────────┘  │
                      └─────────────────────────────┘

  Routing: Web App/Watcher → CloudMap DNS → Squadhub private IP
  Auth:    Browser: Google → Cognito JWT → user record → accountMembers → account → tenantId
           Machine: SQUADHUB_TOKEN → tenant record → tenantId (CLI/watcher)
  Images:  ECR (shared across envs, tagged per env)
```

## Environment Strategy

All CDK stacks are parameterized by environment (`dev` | `prod`):

```bash
cdk deploy --context env=dev   # Deploys to dev
cdk deploy --context env=prod  # Deploys to prod
```

Each environment gets completely isolated resources:

| Resource                | Dev                                       | Prod                                       |
| ----------------------- | ----------------------------------------- | ------------------------------------------ |
| Domain                  | app-dev.clawe.io                          | app.clawe.io                               |
| AUTH_PROVIDER           | `cognito`                                 | `cognito`                                  |
| Cognito User Pool       | clawe-userpool-dev                        | clawe-userpool-prod                        |
| Cognito Domain          | clawe-dev.auth.{region}.amazoncognito.com | clawe-prod.auth.{region}.amazoncognito.com |
| Sign-in method          | Google (social login only)                | Google (social login only)                 |
| ECS Cluster (shared)    | clawe-cluster-dev                         | clawe-cluster-prod                         |
| ECS Cluster (squadhubs) | clawe-squadhubs-dev                       | clawe-squadhubs-prod                       |
| VPC                     | clawe-vpc-dev                             | clawe-vpc-prod                             |
| ALB                     | clawe-alb-dev                             | clawe-alb-prod                             |
| ECR Repos               | Shared across envs                        | Same images, different tags                |
| Convex Deployment       | Separate dev deployment                   | Separate prod deployment                   |
| CloudMap Namespace      | clawe-internal-dev                        | clawe-internal-prod                        |

---

## Phase 1: Shared Client & Watcher Refactor

Code-only changes. No infrastructure needed. Makes the codebase multi-tenant ready.

### 1.1 Refactor shared squadhub client

Update `packages/shared/src/squadhub/client.ts`:

- [x] All exported functions take `SquadhubConnection` (`{ squadhubUrl, squadhubToken }`) as first parameter
- [x] Remove the lazy singleton `getSquadhubClient()` — create client per call
- [x] This makes the client stateless and multi-tenant safe
- [x] Apply same pattern to all functions: `saveTelegramBotToken`, `getConfig`, `patchConfig`, `listSessions`, `sessionsSend`, `sendMessage`, `cronList`, `cronAdd`
- [x] Update `pairing.ts` (`approveChannelPairingCode` takes connection param)
- [x] Export `SquadhubConnection` type from `index.ts`
- [x] Update all tests in `client.spec.ts`

### 1.2 Refactor shared gateway client

Update `packages/shared/src/squadhub/gateway-client.ts`:

- [x] `GatewayClient` constructor accepts `url` and `token` as parameters (verified, no env var fallbacks)
- [x] `createGatewayClient()` requires `SquadhubConnection` as first param (no env var fallback)
- [x] `getSharedClient()` in `shared-client.ts` requires `SquadhubConnection` as first param
- [x] Web app callers pass connection explicitly

### 1.3 Update web app server actions

Update `apps/web/src/lib/squadhub/actions.ts`:

- [x] Each action reads `squadhubUrl` and `squadhubToken` from env (for now — will become per-tenant later)
- [x] Passes them explicitly to shared client functions
- [x] This is the adapter layer: currently reads env, later resolves from tenant record

### 1.4 Update web app API routes

Update all API routes that use the squadhub client:

- [x] `/api/squadhub/health` — pass `squadhubUrl`/`squadhubToken` explicitly
- [x] `/api/squadhub/pairing` — same
- [x] `/api/chat` — reads env at call site via `getSquadhubConfig()`
- [x] `/api/chat/history` — passes connection to `getSharedClient()`
- [x] `/api/chat/abort` — passes connection to `getSharedClient()`
- [x] `/api/business/context` — moved env reads to `getEnvConfig()` called at request time

### 1.5 Refactor watcher — tenant-aware polling loop

Refactor `apps/watcher/src/index.ts`:

- [x] Watcher passes `SquadhubConnection` to all shared client calls (`sessionsSend`, `cronList`, `cronAdd`)
- [x] Connection created from existing `config.squadhubUrl`/`config.squadhubToken`
- [x] Multi-tenant polling loop (`getActiveTenants()` → iterate over tenants in delivery and cron setup)
- [x] `deliverToAgent` and `setupCrons` accept `SquadhubConnection` param
- [x] `deliveryLoop` iterates over tenants, passes tenant connection to each squadhub delivery
- [x] Backwards compatibility: `getActiveTenants()` returns single tenant from env vars
- [x] System-level auth with `WATCHER_TOKEN` → implemented in 2.7 (`validateWatcherToken` + `tenants.listActive`)
- [x] Tenant-scoped Convex calls with per-tenant `machineToken` → implemented in 2.6 (added `machineToken` to all queries)

Current loop:

```
every 2s: poll notifications → deliver to SQUADHUB_URL
every 10s: check routines → trigger via SQUADHUB_URL
```

New loop:

```
every 2s:
  1. Query Convex for all active tenants (tenants.listActive, authenticated with WATCHER_TOKEN)
  2. For each tenant:
     a. Query undelivered notifications using tenant's squadhubToken as machineToken
     b. Deliver to tenant's squadhubUrl
every 10s:
  1. Query Convex for all active tenants (same WATCHER_TOKEN)
  2. For each tenant:
     a. Check due routines using tenant's squadhubToken as machineToken
     b. Trigger via tenant's squadhubUrl
```

Authentication:

- System-level calls (`tenants.listActive`) use `WATCHER_TOKEN` env var
- Tenant-scoped calls (`notifications.getUndelivered`, `routines`) use each tenant's `squadhubToken` as `machineToken` (returned by `listActive`)

For backwards compatibility during development: if no tenants table exists yet, fall back to env-based single-tenant mode.

### 1.6 Move startup logic from watcher to provisioning route

- [x] Remove `registerAgents()` from watcher → moved to `apps/web/src/lib/squadhub/setup.ts`
- [x] Remove `setupCrons()` from watcher → moved to `apps/web/src/lib/squadhub/setup.ts`
- [x] Remove `seedRoutines()` from watcher → moved to `apps/web/src/lib/squadhub/setup.ts`
- [x] Create `POST /api/tenant/provision` route that runs all setup (agents, crons, routines)
- [x] Watcher is now purely a polling/delivery service (no startup side effects)

### 1.7 Update CLI for multi-tenancy

The CLI (`packages/cli`) communicates with Convex directly via `ConvexHttpClient`. It needs to authenticate as a machine caller using the per-tenant `SQUADHUB_TOKEN`.

- [x] CLI reads `SQUADHUB_TOKEN` from env and exports as `machineToken`
- [x] Update `packages/cli/src/client.ts` — added `query`/`mutation`/`action` wrapper functions (pass-through for now; Phase 2.6 will inject `machineToken`)
- [x] Update all 17 command handlers in `packages/cli/src/commands/` to use wrappers instead of `client.query()`/`client.mutation()`
- [x] Update all 16 test files to match new mock pattern

### 1.8 Rebuild and test

- [x] Rebuild shared package: `pnpm --filter @clawe/shared build`
- [x] Rebuild CLI: `pnpm --filter @clawe/cli build`
- [x] Run all tests: `pnpm test` — 155 tests passing (shared 21, cli 64, watcher 5, web 65)
- [x] Verify local docker compose still works (single-tenant mode with env vars)

---

## Phase 2: Multi-Tenancy in Convex

### 2.1 Add users table

- [x] Add to `packages/backend/convex/schema.ts`:

```typescript
users: defineTable({
  email: v.string(),                          // From Cognito JWT (immutable, unique)
  name: v.optional(v.string()),               // Display name
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_email", ["email"]),
```

Cognito is only the authentication layer. The `users` table in Convex is the source of truth for user data. On first login, a user record is created from the Cognito JWT email.

### 2.2 Add accounts + tenants tables

- [x] Add `accounts` table to `packages/backend/convex/schema.ts`:

```typescript
accounts: defineTable({
  name: v.optional(v.string()),        // "Guy's Account"
  createdAt: v.number(),
  updatedAt: v.number(),
}),
```

- [x] Add `tenants` table with `accountId` (tenant belongs to an account, not a user):

```typescript
tenants: defineTable({
  accountId: v.id("accounts"),    // Account that owns this tenant
  status: v.union(
    v.literal("provisioning"),    // Squadhub being created
    v.literal("active"),          // Squadhub running
    v.literal("stopped"),         // Squadhub stopped (future: sleep mode)
    v.literal("error"),           // Provisioning failed
  ),
  squadhubUrl: v.optional(v.string()),         // Internal squadhub URL (CloudMap DNS)
  squadhubToken: v.optional(v.string()),       // Per-tenant squadhub token
  squadhubServiceArn: v.optional(v.string()),  // ECS Service ARN
  efsAccessPointId: v.optional(v.string()),  // EFS access point
  anthropicApiKey: v.optional(v.string()),   // User's Anthropic API key
  settings: v.optional(v.object({
    timezone: v.optional(v.string()),
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_account", ["accountId"])
  .index("by_status", ["status"])
  .index("by_squadhubToken", ["squadhubToken"]),
```

### 2.3 Add accountMembers join table

- [x] Add to `packages/backend/convex/schema.ts`:

```typescript
accountMembers: defineTable({
  userId: v.id("users"),
  accountId: v.id("accounts"),
  role: v.union(v.literal("owner"), v.literal("member")),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_account", ["accountId"])
  .index("by_user_account", ["userId", "accountId"]),
```

Access model: `user → accountMembers → account → tenants`

- A user belongs to an account via `accountMembers`
- An account can own multiple tenants (future: plan-based limits)
- A tenant belongs to exactly one account
- If you're a member of an account, you can access all its tenants

### 2.4 Add tenantId to all existing tables

Add `tenantId: v.id("tenants")` field to every table:

- [x] `agents` — add field + index `by_tenant: ["tenantId"]`
- [x] `tasks` — add field + index `by_tenant: ["tenantId"]`
- [x] `messages` — add field + index `by_tenant: ["tenantId"]`
- [x] `notifications` — add field + index `by_tenant: ["tenantId"]`
- [x] `activities` — add field + index `by_tenant: ["tenantId"]`
- [x] `documents` — add field + index `by_tenant: ["tenantId"]`
- [x] `businessContext` — add field + index `by_tenant: ["tenantId"]`
- [x] `channels` — add field + compound index `by_tenant_type: ["tenantId", "type"]`
- [x] `routines` — add field + index `by_tenant: ["tenantId"]`

### 2.5 Create user and tenant resolution helpers

Create `packages/backend/convex/lib/auth.ts`:

Two auth paths — browser (JWT) and machine (token):

**Browser path (web app):**

- [x] Helper function `getUser(ctx)` — gets auth identity, extracts email, looks up `users` table by email
- [x] Helper function `getTenantIdFromJwt(ctx)` — calls `getUser(ctx)`, queries `accountMembers` by user → account → `tenants` by account, returns first tenant's `_id`

**Machine path — per-tenant (CLI):**

- [x] Helper function `getTenantIdFromToken(ctx, machineToken)` — queries `tenants` by `by_squadhubToken` index, returns tenant `_id`

**Machine path — system-level (watcher):**

- [x] Helper function `validateWatcherToken(ctx, watcherToken)` — reads `WATCHER_TOKEN` from Convex env vars, compares with provided token
- [x] Wire into watcher's `getActiveTenants()` (done in 2.7)

**Unified resolver (for tenant-scoped functions):**

- [x] Helper function `resolveTenantId(ctx, args)` + `resolveTenantIdMut(ctx, args)`:
  1. If `args.machineToken` is provided → `getTenantIdFromToken(ctx, args.machineToken)`
  2. If `AUTH_ENABLED=true` → `getTenantIdFromJwt(ctx)` (requires valid JWT)
  3. If `AUTH_ENABLED=false` → `getOrCreateDevTenant(ctx)` (auto-creates a default dev tenant, mutation variant only)

Create `packages/backend/convex/users.ts`:

- [x] `getOrCreateFromAuth(ctx)` — called on every login, creates user record if needed
- [x] `get()` — get current authenticated user
- [x] `update(name)` — update profile

### 2.6 Update all Convex queries and mutations

Every query/mutation needs to accept optional `machineToken` arg, call `resolveTenantId(ctx, args)`, filter reads by `tenantId`, include `tenantId` in writes.

Example — `agents.list`:

```typescript
// Before:
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

// After:
export const list = query({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    return await ctx.db
      .query("agents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});
```

- Browser calls (web app): `useQuery(api.agents.list)` — no `machineToken`, uses JWT
- Machine calls (CLI): `client.query(api.agents.list, { machineToken })` — uses token

Files to update:

- [x] `convex/agents.ts` — all functions
- [x] `convex/tasks.ts` — all functions
- [x] `convex/messages.ts` — all functions
- [x] `convex/notifications.ts` — all functions
- [x] `convex/activities.ts` — all functions
- [x] `convex/documents.ts` — all functions
- [x] Remove `convex/settings.ts` — migrated `timezone` to `tenants.settings` and `onboardingComplete` to `accounts.onboardingComplete`, dropped `settings` table from schema. Created `convex/tenants.ts` with `getTimezone`, `setTimezone`. Created `convex/accounts.ts` with `isOnboardingComplete`, `completeOnboarding`. Updated callers:
  - `apps/web/src/app/(dashboard)/settings/general/_components/timezone-settings.tsx` → `api.tenants.getTimezone` / `api.tenants.setTimezone`
  - `apps/web/src/hooks/use-onboarding-guard.ts` → `api.accounts.isOnboardingComplete`
  - `apps/web/src/app/page.tsx` → `api.accounts.isOnboardingComplete`
  - `apps/web/src/app/setup/complete/page.tsx` → `api.accounts.completeOnboarding`
  - `apps/web/src/app/setup/provisioning/page.tsx` → `api.accounts.isOnboardingComplete`
  - `apps/watcher/src/index.ts` → `api.tenants.getTimezone` (with `machineToken`)
- [x] `convex/businessContext.ts` — all functions
- [x] `convex/channels.ts` — all functions
- [x] `convex/routines.ts` — all functions
- [x] Update watcher to pass `machineToken` in all Convex calls (`agents.list`, `notifications.getUndelivered`, `notifications.markDelivered`, `routines.getDueRoutines`, `routines.trigger`, `tenants.getTimezone`)

### 2.7 Create tenant management functions

Create `packages/backend/convex/tenants.ts`:

- [x] `create(accountId)` — creates tenant with `accountId`, status "provisioning"
- [x] `getForCurrentUser()` — gets tenant for authenticated user:
  1. Call `getUser(ctx)` to get user record
  2. Query `accountMembers.by_user` to find account membership
  3. Query `tenants.by_account` to find tenant in that account
  4. Return tenant
- [x] `updateStatus(tenantId, status, squadhubUrl?, serviceArn?)` — update provisioning state
- [x] `setApiKeys(anthropicApiKey, openaiApiKey?)` — store API keys in tenant record
- [x] `getApiKeys()` — returns masked API keys (last 4 chars) for settings display
- [x] `listActive(watcherToken)` — get all active tenants with squadhubUrl + squadhubToken (requires valid `WATCHER_TOKEN`)
- [x] Wire watcher's `getActiveTenants()` to call `tenants.listActive` instead of env fallback (deferred from 1.5 → 2.5 → here)
- [x] Wire `validateWatcherToken` into `listActive` (from 2.5)

---

## Phase 3: Authentication (Always-On Auth)

Auth is **always on**. Two providers, one interface:

- **Cloud**: Cognito (Google social login) — JWKS validated by Convex
- **Local / self-hosted**: NextAuth with Credentials provider — auto-login, zero config

The `AUTH_PROVIDER` env var (`nextauth` | `cognito`) controls which provider is active. Both paths produce valid JWTs with the same claims shape. All `AUTH_ENABLED` conditionals have been eliminated.

### 3.1 Convex Auth integration

- [x] `packages/backend/convex/auth.config.nextauth.ts` — NextAuth `customJwt` provider (JWKS URL)
- [x] `packages/backend/convex/auth.config.cognito.ts` — Cognito provider (kept from before)
- [x] `packages/backend/convex/auth.config.ts` — Committed as NextAuth version (default for local dev). Deploy script overwrites for cloud.
- [x] `packages/backend/convex/dev-jwks/` — Committed dev RSA key pair + JWKS JSON for local JWT signing
- [x] `packages/backend/convex/lib/auth.ts` — Simplified: removed `AUTH_ENABLED` checks, dev-tenant logic, `resolveTenantIdMut`. Single `resolveTenantId` works for both queries and mutations.
- [x] `scripts/convex-deploy.sh` — Updated: uses `AUTH_PROVIDER` instead of `AUTH_ENABLED`

### 3.2 Web app — Auth provider and login page

Dual-provider architecture selected by `NEXT_PUBLIC_AUTH_PROVIDER`:

- [x] `apps/web/src/lib/auth/nextauth-config.ts` — NextAuth v5 config with Credentials + RS256 JWT signing
- [x] `apps/web/src/app/api/auth/[...nextauth]/route.ts` — NextAuth API route handler
- [x] `apps/web/src/app/api/auth/jwks/route.ts` — JWKS endpoint for Convex to validate NextAuth JWTs
- [x] `apps/web/src/providers/auth-provider.tsx` — Dual provider: NextAuth (SessionProvider) or Cognito (Amplify, dynamic import). Shared `AuthContextValue` interface. `useConvexAuth` hook for ConvexProviderWithAuth.
- [x] `apps/web/src/providers/convex-provider.tsx` — Always uses `ConvexProviderWithAuth` (no conditional)
- [x] `apps/web/src/app/auth/login/page.tsx` — Email form (NextAuth, auto-login for local dev) or Google button (Cognito)
- [x] `apps/web/src/hooks/use-user-menu.ts` — Simplified: always reads from `useAuth()`, no `AUTH_ENABLED` branches
- [x] `apps/web/src/hooks/use-onboarding-guard.ts` — Simplified: always checks auth, no `AUTH_ENABLED` branches
- [x] `.env.example` + `apps/web/.env.*` — Updated for `AUTH_PROVIDER`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

### 3.3 Web app — Auth middleware

- [x] Protect all routes except `/auth/login` and `/api/health` — `apps/web/src/middleware.ts` checks session cookie, allows `PUBLIC_PATHS`
- [x] Redirect unauthenticated users to `/auth/login` — middleware redirects when no `authjs.session-token` cookie
- [x] Pass tenant context to downstream routes — tenant resolved in Convex via JWT email → user → accountMembers → tenant

### 3.4 Web app — Auth UI components

- [x] User menu in dashboard sidebar (email, logout) — wired `signOut` from `useAuth`
- [x] Onboarding guard hook checks auth state — redirects to `/auth/login` when not authenticated

---

## Phase 4: Dev & Self-Hosted Provisioning

**Goal**: After this phase, local dev and self-hosted deployments work end-to-end. A user can sign in, get auto-provisioned, go through onboarding, use the dashboard, and the watcher operates correctly — all without any cloud infrastructure.

Everything remaining after this phase is cloud-only (CDK, AWS, Cognito, multi-tenant squadhub infrastructure). This clean boundary allows a separate `clawe-cloud` repo to extend this codebase with cloud-specific plugins without modifying the base code.

### 4.1 Plugin architecture (`packages/plugins/`)

Create a `@clawe/plugins` package that provides interfaces for cloud-extensible behavior and a plugin registry. The base repo contains interfaces + dev defaults. The `clawe-cloud` repo adds `packages/cloud-plugins/` that implements these interfaces with AWS.

**Package structure:**

```
packages/plugins/
├── src/
│   ├── index.ts              # Main exports: loadPlugins, hasPlugin, getPlugin, interfaces
│   ├── registry.ts           # Plugin registry internals
│   ├── interfaces/
│   │   ├── index.ts          # Re-exports all interfaces
│   │   ├── squadhub-provisioner.ts    # SquadhubProvisioner interface
│   │   └── squadhub-lifecycle.ts      # SquadhubLifecycle interface
│   └── defaults/
│       ├── index.ts                   # Default implementations
│       ├── squadhub-provisioner.ts    # DefaultSquadhubProvisioner (reads env vars)
│       └── squadhub-lifecycle.ts      # DefaultSquadhubLifecycle (no-ops)
├── package.json
└── tsconfig.json
```

**Plugin interfaces:**

```typescript
// interfaces/squadhub-provisioner.ts
export interface SquadhubProvisioner {
  /**
   * Create infrastructure for a new tenant.
   * Dev: reads SQUADHUB_URL + SQUADHUB_TOKEN from env, returns immediately.
   * Cloud: creates ECS service + EFS access point + CloudMap entry, waits for health.
   */
  provision(params: {
    tenantId: string;
    accountId: string;
    anthropicApiKey?: string;
    convexUrl: string;
  }): Promise<{
    squadhubUrl: string;
    squadhubToken: string;
    metadata?: Record<string, string>; // Cloud: ECS ARN, EFS AP ID, etc.
  }>;

  /**
   * Check provisioning progress (for polling UI).
   * Dev: always returns "active" (instant).
   * Cloud: returns "provisioning" while ECS service is starting.
   */
  getProvisioningStatus(tenantId: string): Promise<{
    status: "provisioning" | "active" | "error";
    message?: string;
  }>;

  /**
   * Tear down all infrastructure for a tenant.
   * Dev: no-op.
   * Cloud: deletes ECS service + EFS access point + CloudMap entry.
   */
  deprovision(params: DeprovisionParams): Promise<void>;
}

// interfaces/squadhub-lifecycle.ts
export interface SquadhubLifecycle {
  /**
   * Restart the tenant's squadhub service (e.g., after API key change).
   * Dev: no-op (user manually restarts docker).
   * Cloud: forces new ECS task deployment.
   */
  restart(tenantId: string): Promise<void>;

  /**
   * Stop the tenant's squadhub service.
   * Dev: no-op.
   * Cloud: sets ECS desiredCount to 0.
   */
  stop(tenantId: string): Promise<void>;

  /**
   * Destroy tenant's squadhub resources permanently.
   * Dev: no-op.
   * Cloud: deletes ECS service + EFS access point + CloudMap entry.
   */
  destroy(tenantId: string): Promise<void>;

  /**
   * Check health/status of the tenant's squadhub.
   * Dev: returns { running: true, healthy: true }.
   * Cloud: checks ECS service running count + task health.
   */
  getStatus(tenantId: string): Promise<{
    running: boolean;
    healthy: boolean;
  }>;
}
```

**Registry:**

```typescript
// registry.ts
export interface PluginMap {
  "squadhub-provisioner": SquadhubProvisioner;
  "squadhub-lifecycle": SquadhubLifecycle;
}

let plugins: PluginMap; // Always set (dev defaults or cloud)
let cloudLoaded = false;

/**
 * Initialize plugins. Call once at app startup.
 * Tries to load @clawe/cloud-plugins. Falls back to dev defaults.
 */
export async function loadPlugins(): Promise<void> {
  try {
    const cloud = await import("@clawe/cloud-plugins");
    plugins = cloud.register();
    cloudLoaded = true;
  } catch {
    plugins = {
      "squadhub-provisioner": new DefaultSquadhubProvisioner(),
      "squadhub-lifecycle": new DefaultSquadhubLifecycle(),
    };
  }
}

/** Returns true if cloud plugins are loaded (vs dev defaults). */
export function hasPlugin(name: keyof PluginMap): boolean {
  return cloudLoaded;
}

/** Get a plugin implementation. Always returns something (cloud or dev default). */
export function getPlugin<K extends keyof PluginMap>(name: K): PluginMap[K] {
  return plugins[name];
}
```

**Dev default implementations:**

```typescript
// defaults/squadhub-provisioner.ts — DefaultSquadhubProvisioner
export class DefaultSquadhubProvisioner implements SquadhubProvisioner {
  async provision(params) {
    // Read from env vars — single-tenant dev mode
    return {
      squadhubUrl: process.env.SQUADHUB_URL || "http://localhost:18790",
      squadhubToken: process.env.SQUADHUB_TOKEN || "",
    };
  }

  async getProvisioningStatus() {
    return { status: "active" as const }; // Instant in dev
  }

  async deprovision() {} // No-op in dev
}

// defaults/squadhub-lifecycle.ts — DefaultSquadhubLifecycle
export class DefaultSquadhubLifecycle implements SquadhubLifecycle {
  async restart() {} // No-op — user manages docker
  async stop() {} // No-op
  async destroy() {} // No-op
  async getStatus() {
    return { running: true, healthy: true };
  }
}
```

**Consumption pattern (call sites):**

```typescript
import { getPlugin, hasPlugin } from "@clawe/plugins";

// Provision route — always works (dev or cloud)
const provisioner = getPlugin("squadhub-provisioner");
const result = await provisioner.provision({ tenantId, accountId, convexUrl });

// Settings UI — conditionally show restart button
if (hasPlugin("squadhub-lifecycle")) {
  // Show "Restart Service" button after API key change
}
```

Setup:

- [x] Create `packages/plugins/` package with interfaces, registry, and dev defaults
- [x] Add to `pnpm-workspace.yaml` (already covered by `packages/*` glob)
- [x] Build outputs: ESM (consumable by Next.js, Node, and React)
- [x] Export types and runtime functions from package entry point

### 4.2 Dev provision route

Update `apps/web/src/app/api/tenant/provision/route.ts`:

Current state: Only runs app-level setup (agents, crons, routines). Doesn't create the tenant or wire connection tokens.

Changes:

- [x] Call `loadPlugins()` at route level (ensures registry is initialized)
- [x] Authenticate the caller via NextAuth session (import `auth` from nextauth-config)
- [x] Get user email from session → look up user in Convex
- [x] Call Convex `accounts.getOrCreateForUser()` to ensure account + membership exist
- [x] Check if account already has a tenant (`tenants.getForCurrentUser`)
- [x] If no tenant: call `tenants.create(accountId)`, then use `getPlugin("squadhub-provisioner").provision()` to get `squadhubUrl` + `squadhubToken`, update tenant with these values + `status: "active"`
- [x] Run existing app-level setup (register agents, setup crons, seed routines) — already implemented in `setupTenant()`
- [x] Return `{ ok: true, tenantId }`

The route is idempotent — calling it when a tenant already exists is a no-op (returns existing tenant).

**Cloud extensibility**: The provision route uses `getPlugin("squadhub-provisioner")` which returns the dev provisioner by default (reads env vars, instant). When `@clawe/cloud-plugins` is installed (in `clawe-cloud` repo), the same route automatically uses the cloud provisioner (creates ECS/EFS/CloudMap, waits for health). No file changes needed.

### 4.3 WATCHER_TOKEN setup

The watcher uses two tokens for Convex authentication:

1. **`WATCHER_TOKEN`** — system-level token for `tenants.listActive()` (get all active tenants)
2. **Per-tenant `squadhubToken`** — returned by `listActive()`, used as `machineToken` for tenant-scoped queries

Setup:

- [x] Add `WATCHER_TOKEN` to root `.env.example` with a default dev value (e.g., `clawe-watcher-dev-token`)
- [x] Add `WATCHER_TOKEN` to root `.env` with the same default
- [x] Add `WATCHER_TOKEN` to `turbo.json` `globalPassThroughEnv`
- [x] Set `WATCHER_TOKEN` as a Convex env var — auto-synced on `pnpm dev` via `scripts/sync-convex-env.sh` (runs as background process in backend dev script, waits for local Convex backend, then sets all env vars)
- [x] Document in `.env.example`: "Must match the value set in Convex env vars"

After the provision route (4.2) runs, the tenant record has `squadhubToken` set to `SQUADHUB_TOKEN` from env. The watcher calls `tenants.listActive(watcherToken)` → gets the tenant's `squadhubToken` → passes it as `machineToken` to all tenant-scoped Convex calls. The full chain works.

### 4.4 Auto-provision flow in web app

After login, the app needs to automatically provision the user if they don't have an active tenant.

- [x] Login page (`/auth/login`) only does: authenticate → `getOrCreateFromAuth()` → redirect to `/`
- [x] Root page (`/`) checks tenant status: no active tenant → redirect to `/setup/provisioning`
- [x] Provisioning page (`/setup/provisioning`) calls `POST /api/tenant/provision`, shows loading/error UI
- [x] Onboarding guards check tenant status before checking `isOnboardingComplete`
- [x] For returning users (tenant already exists), the idempotent provision route returns immediately.

Flow after this step:

```
Login → auth → getOrCreateFromAuth → redirect to /
  → root page queries tenant:
    → no active tenant: redirect to /setup/provisioning
      → provision → redirect to /setup/welcome (or /board if onboarding complete)
    → has active tenant, not onboarded: redirect to /setup
    → has active tenant, onboarded: redirect to /board
```

### 4.5 Environment variables summary

Root `.env.example` additions:

```bash
# Watcher system token (must also be set as Convex env var)
WATCHER_TOKEN=clawe-watcher-dev-token
```

`turbo.json` `globalPassThroughEnv` additions:

```
WATCHER_TOKEN
```

Convex env vars (set via CLI):

```bash
npx convex env set WATCHER_TOKEN clawe-watcher-dev-token
```

### 4.6 Verification

After this phase, verify the complete flow:

1. **Fresh start**: Clear Convex data, restart services
2. **Login**: `AUTO_LOGIN_EMAIL` auto-signs in (or Google OAuth if configured)
3. **Auto-provision**: User + account + tenant created, tenant has `squadhubUrl`/`squadhubToken` from env, agents registered, crons set up
4. **Onboarding**: `/setup/welcome` → business context → telegram → complete — all tenant-scoped queries resolve
5. **Dashboard**: All pages work (agents, board, settings) — data is tenant-scoped
6. **Watcher**: `WATCHER_TOKEN` validates → `listActive` returns tenant → per-tenant `machineToken` resolves → notifications delivered

### 4.7 Dedicated provisioning screen

Move the provision step out of the login page into a shared onboarding screen. This screen is used by all modes (dev, self-hosted, cloud).

**Why**: Login should only authenticate. Provisioning (creating tenant, registering agents, setting up crons) is a separate concern that deserves its own screen with loading state and error handling. For cloud, this step will take longer (spinning up ECS), so having a dedicated screen is essential. For dev/self-hosted it's instant but the flow should be the same.

**Changes:**

- [x] Remove `apiClient.post("/api/tenant/provision")` from `apps/web/src/app/auth/login/page.tsx`
- [x] Login page only does: authenticate → `getOrCreateFromAuth()` → redirect to `/`
- [x] Root page (`/`) queries `api.tenants.getForCurrentUser`, redirects to `/setup/provisioning` if no active tenant
- [x] Create `apps/web/src/app/setup/provisioning/page.tsx`:
  - Calls `POST /api/tenant/provision` on mount
  - Shows loading screen: spinner + "Setting up your workspace..."
  - On success: Convex subscription updates reactively → redirect fires
  - On error: show error message with retry button
  - If tenant already active (idempotent): redirect immediately
  - Uses `useRef` to prevent double-fire in StrictMode
- [x] Update onboarding guard (`use-onboarding-guard.ts`): check tenant exists and is active before checking `isOnboardingComplete`. If no active tenant → redirect to `/setup/provisioning`. Uses `usePathname()` to avoid redirect loop.
- [x] Rename `lib/squadhub/provision.ts` → `lib/squadhub/setup.ts`, `provisionTenant()` → `setupTenant()` (app-level setup, not infrastructure provisioning)
- [x] For cloud (future): poll `GET /api/tenant/status` while status is `"provisioning"`, show progress messages ("Creating workspace...", "Starting services...", "Almost ready...")

**Updated flow:**

```
Login → auth → getOrCreateFromAuth → redirect to /

/ (root page):
  → query getForCurrentUser
  → null or not active → /setup/provisioning
  → active, not onboarded → /setup
  → active, onboarded → /board

/setup/provisioning:
  → tenant already active? → redirect out
  → call POST /api/tenant/provision
  → spinner while provisioning
  → Convex updates reactively → redirect to /setup/welcome or /board

/setup/* (welcome, business, telegram, complete):
  → guard: no active tenant → /setup/provisioning
  → guard: already onboarded → /board

/board (dashboard):
  → guard: no active tenant → /setup/provisioning
  → guard: not onboarded → /setup
```

---

## Phase 5: CDK Project Setup & Base Infrastructure

### 5.1 Initialize CDK project

Create the CDK project in `packages/infra/` (in `clawe-cloud` repo):

```
packages/infra/
├── bin/
│   └── clawe.ts                  # CDK app entry point
├── lib/
│   ├── config.ts                 # Environment config (dev/prod values)
│   ├── networking-stack.ts       # VPC, subnets, security groups
│   ├── auth-stack.ts             # Cognito
│   ├── storage-stack.ts          # EFS, ECR
│   ├── shared-services-stack.ts  # ECS cluster, ALB, web app, watcher
│   ├── tenant-stack.ts           # Per-tenant squadhub construct (Phase 7)
│   ├── dns-stack.ts              # Route53, CloudFront, ACM
│   └── monitoring-stack.ts       # CloudWatch dashboards, alarms
├── cdk.json
├── tsconfig.json
└── package.json
```

- [x] Add `infra` to pnpm workspace — lives in `packages/infra/`, covered by `packages/*` glob
- [x] Install CDK dependencies: `aws-cdk-lib`, `constructs`, `aws-cdk`, `@types/node`, `ts-node`
- [x] Configure `cdk.json` with context defaults (`env: "dev"`)
- [x] Create `bin/clawe.ts` — CDK app entry point wiring all stacks with `--context env=dev|prod`
- [x] Create `lib/config.ts` — environment config (domain, sizing, namespace per dev/prod)
- [x] Create `lib/networking-stack.ts` — VPC, 5 security groups (ALB, web, watcher, squadhub, EFS)
- [x] Create `lib/auth-stack.ts` — Cognito User Pool with Google social login
- [x] Create `lib/storage-stack.ts` — 3 ECR repos + encrypted EFS
- [x] Create `lib/shared-services-stack.ts` — 2 ECS clusters, ALB, web app + watcher Fargate services
- [x] Create `lib/dns-stack.ts` — Route53, ACM certificate, CloudFront distribution
- [x] Create `lib/monitoring-stack.ts` — CloudWatch dashboard + 5xx alarm
- [x] Type-check passes cleanly (`tsc --noEmit`)

### 5.2 Cognito User Pool (Google social login only)

All implemented in `auth-stack.ts` during 5.1. Custom domain (`auth.clawe.io`) instead of prefix domain. Added deletion protection, case-insensitive sign-in, prevent user existence errors (adopted from ChartDB). Removed dead `googleClientSecret` variable; added pre-deploy SSM setup instructions as comments.

Create Cognito User Pool:

- [x] Cognito is only the auth layer — user data lives in Convex `users` table
- [x] No self sign-up with email/password — Google is the only sign-in method (`selfSignUpEnabled: false`)
- [x] No custom Cognito attributes needed (only standard `email` + `fullname`)

Configure Google as federated identity provider:

- [x] Create OAuth 2.0 Client ID in Google Cloud Console (Web application type)
  - Authorized redirect URI: `https://{authDomain}/oauth2/idpresponse`
- [x] Add Google as identity provider in Cognito User Pool:
  - Client ID + Client Secret from SSM (`/clawe/{env}/google-client-id`, `/clawe/{env}/google-client-secret`)
  - Scopes: `openid email profile`
  - Attribute mapping: Google `email` → Cognito `email`, Google `name` → Cognito `fullname`

Configure Cognito domain:

- [x] Custom domain: `auth.clawe.io` (prod) / `auth-dev.clawe.io` (dev) with ACM cert + Route53 alias

Create App Client:

- [x] No client secret (public client for SPA) — `generateSecret: false`
- [x] Auth flows: `userSrp: true` (SRP kept as fallback, Google login uses OAuth flow)
- [x] OAuth settings:
  - Callback URL: `https://app.clawe.io` (prod) / `https://app-dev.clawe.io` (dev) / `http://localhost:3000` (local)
  - Sign-out URL: same as callback
  - OAuth scopes: `openid`, `email`, `profile`
  - Supported identity providers: Google
- [x] Token validity: access 1h, id 1h, refresh 30d

- [x] Output User Pool ID, App Client ID, and Cognito Domain as stack outputs
- [x] Store Google OAuth Client ID and Secret in SSM Parameter Store — done for both dev and prod

### 5.3 Environment config

- [x] Created `packages/infra/lib/config.ts` during 5.1 — maps `env` context to all environment-specific values including `authDomain`, `cloudMapNamespace`, sizing for web/watcher/squadhub, `natGateways`

### 5.4 Networking stack

Created `packages/infra/lib/networking-stack.ts` during 5.1:

- [x] 2 public subnets (ALB)
- [x] 2 private subnets with NAT (ECS tasks, EFS)
- [x] 1 NAT Gateway (dev) / 2 NAT Gateways (prod) for cost vs HA tradeoff
- [x] Security groups:
  - `alb-sg`: inbound 443/80 from internet
  - `web-sg`: inbound from ALB only (port 3000)
  - `squadhub-sg`: inbound from web-sg and watcher-sg (port 18789)
  - `watcher-sg`: outbound to squadhub-sg and internet (Convex)
  - `efs-sg`: inbound NFS (2049) from squadhub-sg

### 5.5 ECR repositories

Created in `packages/infra/lib/storage-stack.ts` during 5.1:

- [x] `clawe/web` — Next.js web app image
- [x] `clawe/squadhub` — Squadhub (OpenClaw gateway) image
- [x] `clawe/watcher` — Watcher service image
- [x] Lifecycle policy: keep last 10 images

### 5.6 EFS filesystem

Created in `packages/infra/lib/storage-stack.ts` during 5.1:

- [x] Encrypted at rest
- [x] Performance mode: generalPurpose
- [x] Throughput mode: bursting (sufficient for tens of users)
- [x] Per-tenant access points created dynamically during provisioning (Phase 8.2 — CloudSquadhubProvisioner)
- [x] Mount targets in each private subnet (created in storage-stack.ts)

### 5.7 SSM Parameter Store secrets

Generate and store shared secrets in SSM Parameter Store (SecureString):

- [x] `/clawe/{env}/watcher-token` (SecureString) — created for dev and prod
- [x] `/clawe/{env}/google-client-id` (String) — created for dev and prod
- [x] `/clawe/{env}/google-client-secret` (SecureString) — created for dev and prod
- [x] Set watcher token as Convex env var — automated in deploy workflow ("Sync Convex env vars" step reads from SSM, sets via `npx convex env set`)

### 5.8 Shared wildcard certificate

Created `lib/certificate-stack.ts`. Single ACM wildcard certificate for all subdomains, replacing per-service certs.

- [x] Create `lib/certificate-stack.ts` — standalone stack (deployed in `us-east-1`)
- [x] Certificate covers: `*.clawe.io` + `clawe.io` (SAN)
- [x] DNS validation via Route53 hosted zone lookup
- [x] Export certificate ARN as stack output (`clawe-wildcard-certificate-arn`)
- [x] Deploy order: certificate-stack deploys **before** auth-stack and dns-stack
- [x] Update `auth-stack.ts` — removed per-domain `AuthCertificate`, accepts shared wildcard cert as prop
- [x] Update `dns-stack.ts` — removed per-domain certificate, accepts shared wildcard cert as prop
- [x] Update `shared-services-stack.ts` — ALB HTTPS listener now uses shared wildcard cert
- [x] Update `bin/clawe.ts` — added certificate stack, passes cert to auth-stack, dns-stack, and shared-services-stack

CloudFront → ALB now uses HTTPS (not HTTP), since ALB has the wildcard cert.

### 5.9 GitHub Actions OIDC for AWS

Created `lib/ci-stack.ts`. Keyless AWS auth — no long-lived credentials in GitHub.

- [x] Create `lib/ci-stack.ts` — deployed once per account (not per environment)
- [x] Create IAM OIDC provider for GitHub (`token.actions.githubusercontent.com`)
- [x] Create IAM role `clawe-github-ci` with trust policy:
  - Principal: GitHub OIDC provider
  - Condition: `sub` matches `repo:getclawe/clawe-cloud:*` (only this repo can assume)
- [x] Role permissions (CDK-native approach — assumes CDK bootstrap roles for deploy):
  - `sts:AssumeRole` on `cdk-*` bootstrap roles (CDK deploy delegates to these)
  - ECR: full push permissions (for Docker image builds done outside CDK)
  - CloudFront: `CreateInvalidation` (post-deploy cache clear)
  - SSM: `GetParameter` scoped to `/clawe/*` (read env config)
  - STS: `GetCallerIdentity`
- [x] Export role ARN as stack output (`clawe-github-ci-role-arn`)
- [x] Add to `bin/clawe.ts` — deployed as `ClaweCi` (no env parameterization)

### 5.10 CI/CD deploy workflow

Created `.github/workflows/deploy.yml`. Manual (`workflow_dispatch`) — no auto-deploy on push.

**Deployment approach**: All ECS service updates go through CDK (`cdk deploy`), not direct `aws ecs update-service`. CDK is the single source of truth — when the image tag changes, CloudFormation detects the task definition update and triggers ECS rolling deployment automatically. This prevents drift and gives us circuit breaker + auto-rollback for free. (Pattern adopted from ChartDB's backend-node deployment.)

- [x] Trigger: `workflow_dispatch` with inputs:
  - `environment`: choice of `dev` / `prod`
  - `targets`: choice of `all` / `infra` / `web` / `watcher` / `squadhub` / `convex`
- [x] Authentication: `aws-actions/configure-aws-credentials` with OIDC (role from 5.9)
- [x] Steps (conditional on `targets`):
  1. **Checkout** + pnpm + Node.js setup
  2. **Configure AWS credentials** via OIDC
  3. **Build & push Docker images** to ECR (web, watcher, squadhub — each conditional)
  4. **Tag images**: `{repo}:{env}-{git-sha}` + `{repo}:{env}-latest`
  5. **Deploy Convex** via `./scripts/convex-deploy.sh`
  6. **CDK deploy** — single command handles infra + ECS updates:
     ```bash
     npx cdk deploy --all --context env={env} --context imageTag={env}-{sha}
     ```
  7. **Invalidate CloudFront cache** — reads distribution ID from stack outputs
  8. **Smoke test** — retries health check for up to 3 minutes
- [x] ECS deployment settings (defined in CDK shared-services-stack):
  - Circuit breaker enabled with auto-rollback on health check failure
  - MaximumPercent: 200% (new tasks start before old ones stop)
  - MinimumHealthyPercent: 50% (allows rolling replacement)
  - Health check grace period: 120s (allows startup time)
- [x] `imageTag` CDK context — shared-services-stack reads `this.node.tryGetContext("imageTag")`, defaults to `{env}-latest`
- [x] Hardcoded in workflow: role ARN (`arn:aws:iam::985539756675:role/clawe-github-ci`), account ID, ECR registry
- [x] GitHub environment secrets configured: `CONVEX_DEPLOY_KEY` (per env: dev + prod)
- [x] GitHub environment variables configured: `CONVEX_URL` (per env: dev + prod)
- [x] Removed `convexUrl` from `config.ts` — now required CDK context (`--context convexUrl=...`), fails fast if missing

---

## Phase 6: Shared Services Deployment (CDK)

All of Phase 6 was implemented in `shared-services-stack.ts` during Phase 5.1, with deployment config (circuit breaker, rolling updates) added in 5.8/5.10.

### 6.1 ECS Clusters

Created in `shared-services-stack.ts`:

**Shared services cluster:**

- [x] Name: `clawe-cluster-{env}`
- [x] Hosts: web app + watcher
- [x] Container insights enabled

**Squadhubs cluster:**

- [x] Name: `clawe-squadhubs-{env}`
- [x] Hosts: per-tenant squadhub ECS Services
- [x] CloudMap namespace: `clawe-internal-{env}` (for squadhub service discovery)
- [x] Container insights enabled
- [x] Separate cluster keeps tenant workloads isolated from shared services

### 6.2 Application Load Balancer

Created in `shared-services-stack.ts`:

- [x] HTTPS listener (443) with shared wildcard certificate
- [x] HTTP listener (80) — redirect to HTTPS
- [x] Target groups:
  - `web-tg`: routes to web app service (default rule)
- [x] Health check: `/api/health` (interval 30s, healthy 2, unhealthy 3)

### 6.3 Web app Fargate service

- [x] ECS service for the Next.js app (in `shared-services-stack.ts`):

- Task definition:
  - Image: `fromEcrRepository(webRepo, imageTag)` — image tag from CDK context
  - CPU: 512 (dev) / 1024 (prod)
  - Memory: 1024 (dev) / 2048 (prod)
  - Port: 3000
  - Environment: `NODE_ENV`, `ENVIRONMENT`, `NEXT_PUBLIC_CONVEX_URL` (from context), `NEXT_PUBLIC_COGNITO_*` (from auth stack), `NEXT_PUBLIC_APP_URL`, `AWS_REGION`, infrastructure refs for provisioning (cluster ARN, namespace ID, EFS ID, squadhub image, SG IDs, subnet IDs)
  - IAM role: ECS provisioning, EFS access points, CloudMap service discovery, IAM PassRole
  - Logging: `/clawe/web-{env}` (30d dev, 90d prod)
- Service:
  - Desired count: 1 (dev) / 2 (prod)
  - Circuit breaker with auto-rollback
  - MaximumPercent: 200%, MinimumHealthyPercent: 50%
  - Health check grace period: 120s
  - ALB target group attachment
  - [ ] Auto-scaling: target CPU 70%, min 1 / max 10 (prod only) — **to add**

### 6.4 Watcher Fargate service

- [x] ECS service for the shared watcher (in `shared-services-stack.ts`):

- Task definition:
  - Image: `fromEcrRepository(watcherRepo, imageTag)` — same context as web
  - CPU: 256, Memory: 512
  - Environment: `CONVEX_URL` (from context), `ENVIRONMENT`
  - Secrets: `WATCHER_TOKEN` from SSM (`/clawe/{env}/watcher-token`)
  - IAM role: CloudMap DiscoverInstances
  - Logging: `/clawe/watcher-{env}` (30d dev, 90d prod)
- Service:
  - Desired count: 1
  - Circuit breaker with auto-rollback
  - No ALB attachment (internal service only)

---

## Phase 7: Per-Tenant Squadhub (CDK + Runtime)

### 7.1 Base squadhub task definition (shared infrastructure in CDK)

Phase 7.1 creates the **shared CDK infrastructure** that all per-tenant squadhub services reference. The actual per-tenant ECS task definitions and services are created at **runtime** by CloudSquadhubProvisioner (Phase 8).

Changes in `packages/infra/lib/shared-services-stack.ts`:

- [x] Shared squadhub execution role (`clawe-squadhub-exec-{env}`) — ECS Fargate execution role for ECR pulls + CloudWatch log writes, with `AmazonECSTaskExecutionRolePolicy`
- [x] Shared squadhub task role (`clawe-squadhub-task-{env}`) — runtime role with EFS mount/write/root access (scoped to file system ARN) + CloudMap `DiscoverInstances`
- [x] Shared squadhub log group (`/clawe/squadhub-{env}`) — tenant-specific stream prefixes set at runtime by CloudSquadhubProvisioner (30d dev, 90d prod retention)
- [x] Export role ARNs + log group to web container env vars: `SQUADHUB_EXECUTION_ROLE_ARN`, `SQUADHUB_TASK_ROLE_ARN`, `SQUADHUB_LOG_GROUP`
- [x] Tightened `iam:PassRole` scope from `resources: ["*"]` to the two specific role ARNs

Per-tenant ECS task definition template (created at runtime by CloudSquadhubProvisioner in Phase 8):

- Image: `{account}.dkr.ecr.{region}.amazonaws.com/clawe/squadhub:{env}-latest`
- CPU: 256 (0.25 vCPU)
- Memory: 512 (0.5 GB)
- Port: 18789
- EFS volume mount: `/data` (access point set per-tenant at runtime)
- Health check: `wget -q --spider http://localhost:18789/health`
- IAM task role: shared `clawe-squadhub-task-{env}` (EFS + CloudMap)
- IAM execution role: shared `clawe-squadhub-exec-{env}` (ECR + logs)
- Logging: shared `/clawe/squadhub-{env}` log group with tenant-specific stream prefix

### 7.2 CloudMap service discovery

All CDK infrastructure for CloudMap is already in place (created in Phase 5.1 + 7.1). Per-tenant service registration happens at runtime via CloudSquadhubProvisioner (Phase 8.2).

- [x] CloudMap private DNS namespace (`clawe-internal-{env}`) — created in shared-services-stack
- [x] Namespace ID + name exported to web container (`CLOUDMAP_NAMESPACE_ID`, `CLOUDMAP_NAMESPACE_NAME`)
- [x] Web app task role has full CloudMap permissions (`CreateService`, `DeleteService`, `RegisterInstance`, `DeregisterInstance`, `DiscoverInstances`, `GetService`, `ListInstances`)
- [x] Watcher task role has `DiscoverInstances` permission
- [x] Squadhub task role has `DiscoverInstances` permission (added in 7.1)

Runtime (Phase 8.2): CloudSquadhubProvisioner creates per-tenant CloudMap service entries (`squadhub-{tenantId}.clawe-internal-{env}`) and associates with ECS services. Web app resolves `squadhub-{tenantId}.clawe-internal-{env}` → private IP:18789.

### 7.3 Squadhub lifecycle API routes

These routes use `getPlugin("squadhub-lifecycle")` from `@clawe/plugins`. In dev, they return no-ops. In cloud, `CloudSquadhubLifecycle` manages ECS services.

- [x] `POST /api/tenant/squadhub/restart` — calls `getPlugin("squadhub-lifecycle").restart(tenantId)`
- [x] `GET /api/tenant/squadhub/status` — calls `getPlugin("squadhub-lifecycle").getStatus(tenantId)`
- [x] `DELETE /api/tenant/squadhub` — calls `getPlugin("squadhub-lifecycle").destroy(tenantId)`
- [x] Extracted shared `getAuthenticatedTenant()` helper (`lib/api/tenant-auth.ts`) — reads JWT from Authorization header, resolves tenant via Convex

These routes live in the **base repo** and work for both dev and cloud via the plugin interface.

---

## Phase 8: Cloud Tenant Provisioning

### 8.1 Cloud plugins package (`packages/cloud-plugins/`)

Create `@clawe/cloud-plugins` in the `clawe-cloud` repo. This package implements the `@clawe/plugins` interfaces (from Phase 4.1) with real AWS infrastructure.

**Package structure (in `clawe-cloud` repo):**

```
packages/cloud-plugins/
├── src/
│   ├── index.ts              # register() function — returns PluginMap
│   ├── squadhub-provisioner.ts  # CloudSquadhubProvisioner implements SquadhubProvisioner
│   └── squadhub-lifecycle.ts    # CloudSquadhubLifecycle implements SquadhubLifecycle
├── package.json                 # depends on @clawe/plugins (for types), aws-sdk
└── tsconfig.json
```

**Registration:**

```typescript
// cloud-plugins/src/index.ts
import type { PluginMap } from "@clawe/plugins";
import { CloudSquadhubProvisioner } from "./squadhub-provisioner";
import { CloudSquadhubLifecycle } from "./squadhub-lifecycle";

export function register(): PluginMap {
  return {
    "squadhub-provisioner": new CloudSquadhubProvisioner(),
    "squadhub-lifecycle": new CloudSquadhubLifecycle(),
  };
}
```

When `@clawe/cloud-plugins` is installed and `loadPlugins()` runs, the base provision route (Phase 4.2) automatically uses `CloudSquadhubProvisioner` instead of `DefaultSquadhubProvisioner`. No route file changes needed.

- [x] Create `packages/cloud-plugins/` with `CloudSquadhubProvisioner` and `CloudSquadhubLifecycle` (stub implementations, `throw new Error` for each method)
- [x] Add `@clawe/plugins` as dependency (for interfaces)
- [x] Add `@aws-sdk/client-ecs`, `@aws-sdk/client-efs`, `@aws-sdk/client-servicediscovery` as dependencies
- [x] Already covered by `packages/*` glob in `pnpm-workspace.yaml`
- [x] Add `@clawe/cloud-plugins: "workspace:*"` to `apps/web/package.json` in `clawe-cloud` — this is the single line that activates cloud plugins (without it, `loadPlugins()` falls back to defaults)

### 8.2 CloudSquadhubProvisioner implementation

Implement `SquadhubProvisioner` interface with AWS infrastructure:

**`provision()`:**

- [x] 1. Create EFS access point for tenant (path: `/tenants/{tenantId}`)
- [x] 2. Register ECS task definition (from base template, with tenant-specific env vars):
     - `SQUADHUB_TOKEN` — generated per-tenant UUID
     - API keys patched via `patchConfig` after provisioning (from Convex tenant record)
     - `CONVEX_URL` — from `params.convexUrl`
     - `OPENCLAW_STATE_DIR=/data/config`
     - `OPENCLAW_PORT=18789`
     - `OPENCLAW_SKIP_GMAIL_WATCHER=1`
- [x] 3. Create ECS Service on `clawe-squadhubs-{env}` cluster with `desiredCount: 1`
- [x] 4. Associate with CloudMap service discovery (`squadhub-{tenantId}.clawe-internal-{env}`)
- [x] 5. Return `{ squadhubUrl, squadhubToken, metadata: { serviceArn, efsAccessPointId } }`

**`getProvisioningStatus()`:**

- [x] Query ECS Service running count and task health
- [x] Return `"provisioning"` while tasks are starting, `"active"` when healthy, `"error"` on failure

**`deprovision(params: DeprovisionParams)`:**

- [x] Delete ECS Service (force delete, stops running tasks)
- [x] Deregister task definition
- [x] Deregister CloudMap service entry
- [x] Delete EFS access point (via `params.metadata.efsAccessPointId`)
- [x] Best-effort cleanup — continues through all steps, collects errors, throws aggregate error

**Error handling:**

- [x] `provision()` uses compensating transactions — on failure, rolls back all created resources (best-effort)
- [x] `deprovision()` uses best-effort pattern — attempts all cleanup steps, throws aggregate error if any non-404 failures

Environment variables for the squadhub ECS task:

```
SQUADHUB_TOKEN={generated-per-tenant}       # Used for both: squadhub HTTP auth AND Convex machine auth
CONVEX_URL={env-specific-convex-url}
OPENCLAW_STATE_DIR=/data/config
OPENCLAW_PORT=18789
OPENCLAW_SKIP_GMAIL_WATCHER=1
# API keys (Anthropic, OpenAI) are patched into squadhub config via patchConfig after provisioning
```

Note: `TENANT_ID` is not needed as an env var — the CLI resolves the tenant by passing `SQUADHUB_TOKEN` as `machineToken` to Convex, which looks up the tenant via the `by_squadhubToken` index.

**Important: `initProcessEnabled` must be set to `true`** in the ECS container definition's `linuxParameters`. OpenClaw does a "full process restart" on certain config changes (e.g. adding a Telegram channel) — it spawns a child process and the parent exits. Without an init process (tini), PID 1 exits and the container/task dies. The Dockerfile includes `tini` in the ENTRYPOINT, but ECS should also have `initProcessEnabled: true` as a safety net.

### 8.3 CloudSquadhubLifecycle implementation

Implement `SquadhubLifecycle` interface with ECS operations:

**`restart(tenantId)`:**

- [x] Force new deployment on the tenant's ECS Service via `UpdateServiceCommand` with `forceNewDeployment: true`

**`stop(tenantId)`:**

- [x] Set ECS Service `desiredCount: 0` via `UpdateServiceCommand`

**`destroy(tenantId)`:**

- [x] Delete ECS Service (force) + deregister task definition
- [x] Delete EFS access point (looked up by `clawe:tenantId` tag)
- [x] Delete CloudMap service entry
- [x] Best-effort cleanup — continues through all steps, throws aggregate error

**`getStatus(tenantId)`:**

- [x] Check ECS Service running count via `DescribeServicesCommand`
- [x] Check task-level health via `ListTasksCommand` + `DescribeTasksCommand`
- [x] Return `{ running: runningCount > 0, healthy: container.healthStatus === "HEALTHY" }`

**Refactoring:**

- [x] Extracted shared utilities (`getEnvConfig`, `serviceName`, `isNotFoundError`, `toError`, AWS clients) to `aws-config.ts`
- [x] Updated `squadhub-provisioner.ts` to import from `aws-config.ts`

### 8.4 Provisioning status polling

Create `apps/web/src/app/api/tenant/status/route.ts`:

- [x] Calls `getPlugin("squadhub-provisioner").getProvisioningStatus(tenantId)`
- [x] Returns status to client for polling
- [x] Works for both dev (instant "active") and cloud (real status)

### 8.5 Cloud provisioning UI flow

**Note**: The shared `/setup/provisioning` screen (Phase 4.7) already handles the full flow — loading state, error handling, and redirect. This step just ensures the cloud polling path works end-to-end:

- [x] Verify `GET /api/tenant/status` (8.4) returns real ECS status via `CloudSquadhubProvisioner.getProvisioningStatus()`
- [x] Verify `/setup/provisioning` page polls status while `"provisioning"` and shows progress messages ("Creating workspace...", "Starting services...", "Almost ready...")
- [x] Verify redirect to `/setup/welcome` once status is `"active"`
- [x] No new UI page needed — reuses the shared screen from 4.7

### 8.6 Dynamic squadhub routing

Currently the web app reads `SQUADHUB_URL` from env. This needs to become per-tenant:

- [x] Update `apps/web/src/lib/squadhub/connection.ts`:
  - `getConnection(tenant?)` — uses tenant's `squadhubUrl` + `squadhubToken` if provided
  - Falls back to env vars when no tenant (self-hosted / dev)
  - No cache needed — tenant data comes from the same `getAuthenticatedTenant()` query used for auth

- [x] Update all API routes that call the squadhub (already refactored in Phase 1 to accept params):
  - `/api/chat` — resolve tenant's squadhub URL before calling
  - `/api/chat/history` — same
  - `/api/chat/abort` — same
  - `/api/squadhub/health` — same
  - `/api/squadhub/pairing` — same

- [x] Refactor `getAuthenticatedTenant` return type to clean discriminated union (`{ error, convex, tenant }`)

### 8.7 API Key Management

API keys (Anthropic required, OpenAI optional) are stored in the Convex tenant record — the single source of truth. Removed from env vars entirely.

Update onboarding flow (4 → 5 steps):

- [x] New `/setup/api-keys` step (2/5) between Welcome and Business
- [x] Anthropic API key input (required, validated server-side via `/api/tenant/validate-key`)
- [x] OpenAI API key input (optional, validated server-side)
- [x] Store keys in Convex via `tenants.setApiKeys()`
- [x] Update Welcome page: navigate to `/setup/api-keys`, add API key to "You'll need" list
- [x] Update step numbers: Business (3/5), Telegram (4/5), Complete (5/5)

Server-side key validation:

- [x] `POST /api/tenant/validate-key` — validates Anthropic/OpenAI keys server-side

Provision route integration:

- [x] After provisioning, read keys from tenant record and patch into squadhub config via `patchApiKeys()`
- [x] `patchApiKeys()` server action calls `patchConfig()` to set auth profiles

Settings page:

- [x] Add "API Keys" section to `/settings/general` (between General and Timezone)
- [x] Query `getApiKeys()` for masked display
- [x] Validate + save new keys via `setApiKeys()` mutation
- [x] In cloud (`hasPlugin()`): call `/api/tenant/squadhub/restart` after save
- [x] In dev: show info message "Restart your squadhub container to apply changes"

Env var cleanup:

- [x] Remove `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` from `docker-compose.yml`
- [x] Remove from `.env.example`, `turbo.json`, `scripts/start.sh`
- [x] Update `CLAUDE.md`, `apps/web/CLAUDE.md`, `README.md` documentation

### 8.8 Squadhub extensions package (`packages/squadhub-extensions/`)

**Problem**: The pairing flow (`listChannelPairingRequests` / `approveChannelPairingCode` in `packages/shared/src/squadhub/pairing.ts`) reads/writes JSON files on the squadhub's local filesystem (`~/.squadhub/credentials/<channel>-pairing.json`). In cloud, the web app container can't access the squadhub container's filesystem.

**Solution**: Create an OpenClaw plugin package that runs inside the squadhub container (in-process with the Gateway). It has direct filesystem access and exposes operations as tools callable via the existing `POST /tools/invoke` HTTP API — same mechanism used for `getConfig`, `patchConfig`, `sessions_list`, etc.

The package is a general-purpose home for all Clawe-specific OpenClaw extensions. Each tool lives in its own file under `tools/`. Adding a new tool = add a file + import it in `index.ts`.

OpenClaw uses [jiti](https://github.com/unjs/jiti) to load plugins, so it can load raw `.ts` files directly. We still use tsup to compile to JS for CI validation (type checking + build verification).

**Package structure:**

```
packages/squadhub-extensions/
├── src/
│   ├── index.ts              # Plugin entry: imports and registers all tools
│   └── tools/
│       └── pairing.ts        # clawe_pairing tool (list + approve actions)
├── openclaw.plugin.json      # OpenClaw plugin manifest
├── package.json
├── tsconfig.json
└── tsup.config.ts            # Bundles to single JS file (like CLI)
```

**Plugin manifest** (`openclaw.plugin.json`):

```json
{
  "id": "clawe",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

**Plugin entry** (`src/index.ts`):

```typescript
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { registerPairingTool } from "./tools/pairing";

export default function register(api: OpenClawPluginApi) {
  registerPairingTool(api);
  // Future tools registered here
}
```

**Pairing tool** (`src/tools/pairing.ts`):

Registers a `clawe_pairing` tool with two actions:

- `list` — reads `<channel>-pairing.json` from the squadhub state dir, prunes expired requests, returns pending list
- `approve` — finds matching code, reads config via gateway API (`getConfig`), updates `allowFrom` via `patchConfig`, removes request from pairing file

The tool replicates the logic from `packages/shared/src/squadhub/pairing.ts` but runs inside the squadhub container where it has filesystem access.

**Build** (`tsup.config.ts`):

```typescript
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  bundle: true,
  noExternal: [/.*/],
});
```

**Package scripts** (`package.json`):

```json
{
  "name": "@clawe/squadhub-extensions",
  "scripts": {
    "build": "tsup",
    "check-types": "tsc --noEmit"
  }
}
```

**Dockerfile changes** (`docker/squadhub/Dockerfile`):

```dockerfile
# Copy Clawe OpenClaw extensions (plugin bundle + manifest)
COPY packages/squadhub-extensions/dist/index.js /opt/clawe/extensions/clawe/dist/index.js
COPY packages/squadhub-extensions/openclaw.plugin.json /opt/clawe/extensions/clawe/openclaw.plugin.json
COPY packages/squadhub-extensions/package.json /opt/clawe/extensions/clawe/package.json
```

**Config template changes** (`docker/squadhub/templates/config.template.json`):

Add plugin loading config (points directly to the static path, no entrypoint changes needed):

```json
{
  "plugins": {
    "load": {
      "paths": ["/opt/clawe/extensions/clawe"]
    }
  }
}
```

**Web app changes** — update pairing route and shared client:

1. Add pairing tool functions to `packages/shared/src/squadhub/client.ts`:
   - `listPairingRequests(connection, channel)` — calls `invokeTool(connection, "clawe_pairing", "list", { channel })`
   - `approvePairingCode(connection, channel, code)` — calls `invokeTool(connection, "clawe_pairing", "approve", { channel, code })`

2. Update `apps/web/src/app/api/squadhub/pairing/route.ts`:
   - GET: replace `listChannelPairingRequests(channel)` (filesystem) with `listPairingRequests(getConnection(auth.tenant), channel)` (HTTP tool invoke)
   - POST: replace `approveChannelPairingCode(connection, channel, code)` (filesystem + HTTP) with `approvePairingCode(connection, channel, code)` (HTTP tool invoke only)

3. The old filesystem-based functions in `packages/shared/src/squadhub/pairing.ts` can be removed — the web app no longer calls them directly.

**Implementation tasks:**

- [x] Create `packages/squadhub-extensions/` package with `package.json`, `tsconfig.json`, `tsup.config.ts`
- [x] Implement `openclaw.plugin.json` manifest
- [x] Implement `src/index.ts` — plugin entry that registers all tools
- [x] Implement `src/tools/pairing.ts` — `clawe_pairing` tool with `list` and `approve` actions
- [x] Add `listPairingRequests` and `approvePairingCode` to `packages/shared/src/squadhub/client.ts` (invoke via `/tools/invoke`)
- [x] Update `apps/web/src/app/api/squadhub/pairing/route.ts` to use new client functions instead of filesystem-based pairing
- [x] Update `docker/squadhub/Dockerfile` — copy built extensions to extensions directory
- [x] Update `docker/squadhub/templates/config.template.json` — add `plugins.load.paths`
- [x] Build passes: `pnpm --filter @clawe/squadhub-extensions build`
- [x] Type check passes: `pnpm --filter @clawe/squadhub-extensions check-types`
- [x] Remove old filesystem-based pairing functions from `packages/shared/src/squadhub/pairing.ts`

**Verification:**

1. `pnpm --filter @clawe/squadhub-extensions build` — bundles to single JS file in `dist/`
2. `pnpm --filter @clawe/squadhub-extensions check-types` — clean
3. Docker build includes plugin in `/opt/clawe/extensions/clawe/`
4. Squadhub gateway starts with plugin loaded (check logs for plugin registration)
5. `POST /tools/invoke { tool: "clawe_pairing", action: "list", args: { channel: "telegram" } }` returns pairing requests
6. End-to-end: Telegram pairing flow works via the plugin (list → approve → config updated)

---

## Phase 9: Cloud Onboarding Flow Updates

### 9.1 New onboarding step order

```
1. Sign in with Google       (Cognito OAuth redirect)
2. Provisioning              (auto — create tenant + start squadhub)
3. Anthropic API Key         (new step — enter API key, stored in Convex tenant record)
4. Business Context          (existing — chat with Clawe agent)
5. Telegram (optional)       (existing — bot token + pairing)
6. Complete                  (existing)
```

### 9.2 API Key onboarding step

**Completed in Phase 8.7** — `/setup/api-keys` page handles both Anthropic (required) and OpenAI (optional) keys with server-side validation. Works for all modes (dev + cloud).

### 9.3 Settings — API Key management

**Completed in Phase 8.7** — API Keys section in `/settings/general` with masked display, validation, and cloud restart support.

---

## Phase 10: DNS & CDN (CDK)

All of Phase 10 was implemented in `dns-stack.ts` during Phase 5.1, updated in 5.8 to use shared wildcard cert.

### 10.1 Hosted Zone lookup

- [x] Look up existing Route53 hosted zone for `clawe.io` via `HostedZone.fromLookup`

### 10.2 ACM Certificate

- [x] Uses shared wildcard cert from Phase 5.8 (`*.clawe.io` + `clawe.io`), passed as prop to dns-stack

### 10.3 CloudFront distribution

- [x] Created in `dns-stack.ts`:
  - Origin: ALB via HTTPS (wildcard cert on ALB)
  - Alternate domain: `app.clawe.io` / `app-dev.clawe.io`
  - Certificate: shared wildcard cert
  - Cache policy: caching disabled (dynamic Next.js app)
  - Origin request policy: ALL_VIEWER (forwards all headers/cookies)
  - Allowed methods: ALL (GET, POST, PUT, DELETE, etc.)
  - Exports `DistributionId` (used by deploy workflow for cache invalidation)

### 10.4 Route53 record

- [x] A record (alias) pointing `app.clawe.io` / `app-dev.clawe.io` to CloudFront distribution

---

## Phase 11: Docker Images & CI/CD

CI/CD foundation was set up in Phase 5.9–5.10. Image builds use `docker/build-push-action` with GitHub Actions layer caching.

### 11.1 Image tagging convention

- [x] Tagging implemented in deploy workflow (Phase 5.10):
  - `clawe/web:{env}-{git-sha}` + `clawe/web:{env}-latest`
  - `clawe/watcher:{env}-{git-sha}` + `clawe/watcher:{env}-latest`
  - `clawe/squadhub:{env}-{git-sha}` + `clawe/squadhub:{env}-latest`
- [x] Uses `docker/metadata-action@v5` for tag/label generation
- [x] Uses `docker/build-push-action@v6` with `docker/setup-buildx-action@v3`
- [x] GitHub Actions layer caching (`cache-from/cache-to: type=gha`) per image scope
- [x] Per-tenant squadhub rolling update via `aws ecs update-service --force-new-deployment` on all services in squadhubs cluster

### 11.2 Refine deploy workflow (future optimization)

- [ ] Use `turbo prune --docker` in Dockerfiles for smaller images and faster builds
- [ ] Parallel jobs: build web/watcher/squadhub images in parallel
- [ ] Selective builds: only rebuild images whose source changed (based on git diff)
- [ ] Post-deploy Slack notification (optional)

---

## Phase 12: Monitoring (CDK)

Basic monitoring created in `monitoring-stack.ts` during Phase 5.1. Log groups created in `shared-services-stack.ts`.

### 12.1 CloudWatch alarms

- [x] ALB 5xx error rate alarm (threshold > 5 in 5 minutes) — in `monitoring-stack.ts`
- [ ] Web app: CPU > 80%, unhealthy targets
- [ ] Squadhub services: task stopped unexpectedly, health check failures
- [ ] Watcher: task stopped, log errors
- [ ] EFS: burst credit balance low

### 12.2 CloudWatch dashboard

- [x] ALB request count widget — in `monitoring-stack.ts`
- [x] ALB 5xx errors widget — in `monitoring-stack.ts`
- [ ] Active tenants count
- [ ] Squadhub services running / restarting
- [ ] Web app latency
- [ ] EFS usage

### 12.3 Log groups

- [x] `/clawe/web-{env}` — web app logs (30d dev, 90d prod) — in `shared-services-stack.ts`
- [x] `/clawe/watcher-{env}` — watcher logs (30d dev, 90d prod) — in `shared-services-stack.ts`
- [x] `/clawe/squadhub-{env}` — shared squadhub log group with per-tenant stream prefixes (Phase 7.1, 30d dev, 90d prod)

---

## Implementation Order

```
Phase 1  (Shared client & watcher refactor)  — ✅ COMPLETE
  │
Phase 2  (Multi-tenancy in Convex)           — ✅ COMPLETE
  │
Phase 3  (Authentication)                    — ✅ COMPLETE
  │
Phase 4  (Dev & self-hosted provisioning)    — ✅ COMPLETE
  │  includes: @clawe/plugins package (interfaces + registry + dev defaults)
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  │  ↑ Dev & self-hosted complete here (base repo: clawe)
  │  ↓ Everything below is cloud-only (clawe-cloud repo)
  │
Phase 5  (CDK setup + base infra)            — ✅ COMPLETE (all stacks + CI/CD + SSM params)
  │
Phase 6  (Shared services CDK)               — ✅ COMPLETE (done in 5.1, auto-scaling pending)
  │
Phase 7  (Per-tenant squadhub CDK)           — NEXT
  │
Phase 8  (Cloud tenant provisioning)         — @clawe/cloud-plugins + AWS provisioning
  │  includes: CloudSquadhubProvisioner + CloudSquadhubLifecycle + @clawe/squadhub-extensions
  │  8.7 API Key Management: ✅ COMPLETE (onboarding step, settings UI, env var cleanup)
  │
Phase 9  (Cloud onboarding updates)          — 9.2/9.3 completed in Phase 8.7
  │
Phase 10 (DNS & CDN)                         — ✅ COMPLETE (done in 5.1)
  │
Phase 11 (CI/CD)                             — ✅ COMPLETE (deploy workflow + image builds done in 5.10)
  │
Phase 12 (Monitoring)                        — PARTIAL (basic dashboard + 5xx alarm + log groups done)
```

Phases 1-4: complete (base repo: clawe).
Phases 5, 6, 10, 11: complete (clawe-cloud repo) — all CDK stacks, CI/CD, DNS/CDN.
Phase 12: partial — basic monitoring done, advanced alarms/dashboards deferred.
**Next: Phase 7** (per-tenant squadhub infrastructure) → Phase 8 (cloud provisioning) → Phase 9 (onboarding).

---

## Files to Create

### Base repo (clawe)

```
packages/plugins/                             (new — Phase 4.1)
├── src/
│   ├── index.ts                              # Main exports: loadPlugins, hasPlugin, getPlugin
│   ├── registry.ts                           # Plugin registry internals
│   ├── interfaces/
│   │   ├── index.ts                          # Re-exports all interfaces
│   │   ├── squadhub-provisioner.ts            # SquadhubProvisioner interface
│   │   └── squadhub-lifecycle.ts             # SquadhubLifecycle interface
│   └── defaults/
│       ├── index.ts                          # Dev default implementations
│       ├── squadhub-provisioner.ts            # DefaultSquadhubProvisioner (reads env vars)
│       └── squadhub-lifecycle.ts             # DefaultSquadhubLifecycle (no-ops)
├── package.json
└── tsconfig.json

apps/web/src/
├── proxy.ts                                  (new — renamed from middleware.ts)
├── app/auth/
│   └── login/page.tsx                        (new — "Sign in with Google" button)
├── app/api/tenant/
│   ├── provision/route.ts                    (new)
│   ├── status/route.ts                       (new — uses getPlugin("squadhub-provisioner"))
│   └── squadhub/
│       ├── restart/route.ts                  (new — uses getPlugin("squadhub-lifecycle"))
│       └── status/route.ts                   (new — uses getPlugin("squadhub-lifecycle"))
├── providers/auth-provider.tsx               (new)
├── lib/squadhub/connection.ts                 (updated — tenant-aware getConnection)
└── hooks/use-auth.ts                         (new)

packages/backend/convex/
├── auth.config.cognito.ts                    (new — Cognito auth provider template)
├── auth.config.nextauth.ts                   (new — NextAuth customJwt provider)
├── auth.config.ts                            (generated — copied from template at deploy time)
├── users.ts                                  (new)
├── tenants.ts                                (new)
├── accounts.ts                               (new — account management)
├── lib/auth.ts                               (new)
├── schema.ts                                 (modify — add tenantId everywhere)
├── agents.ts                                 (modify — tenant filtering)
├── tasks.ts                                  (modify — tenant filtering)
├── messages.ts                               (modify — tenant filtering)
├── notifications.ts                          (modify — tenant filtering)
├── activities.ts                             (modify — tenant filtering)
├── documents.ts                              (modify — tenant filtering)
├── settings.ts                               (deleted — migrated to tenants.ts)
├── businessContext.ts                         (modify — tenant filtering)
├── channels.ts                               (modify — tenant filtering)
└── routines.ts                               (modify — tenant filtering)

packages/squadhub-extensions/                  (new — Phase 8.8)
├── src/
│   ├── index.ts                              # Plugin entry: registers all tools
│   └── tools/
│       └── pairing.ts                        # clawe_pairing tool
├── openclaw.plugin.json                      # Plugin manifest (id: "clawe")
├── package.json
├── tsconfig.json
└── tsup.config.ts                            # Bundles to single JS file

packages/shared/src/squadhub/
├── client.ts                                 (modify — accept url/token params, add pairing tool invocations)
└── gateway-client.ts                         (modify — accept url/token params)

packages/cli/src/
├── client.ts                                 (modify — add machineToken to all calls)
└── commands/*.ts                             (modify — pass machineToken)

apps/watcher/src/
├── index.ts                                  (modify — multi-tenant loop)
└── config.ts                                 (modify — remove single-tenant env vars)

apps/web/src/lib/squadhub/
└── actions.ts                                (modify — per-tenant routing)
```

### Cloud repo (clawe-cloud) — only new files, no base file modifications

```
packages/cloud-plugins/                       (new — Phase 8.1)
├── src/
│   ├── index.ts                              # register() → PluginMap with cloud impls
│   ├── squadhub-provisioner.ts                # CloudSquadhubProvisioner implements SquadhubProvisioner
│   └── squadhub-lifecycle.ts                  # CloudSquadhubLifecycle implements SquadhubLifecycle
├── package.json                              # depends on @clawe/plugins, @aws-sdk/*
└── tsconfig.json

packages/infra/                                  (new — Phase 5+)
├── bin/clawe.ts
├── lib/
│   ├── config.ts
│   ├── certificate-stack.ts                     # Shared wildcard cert (Phase 5.8)
│   ├── ci-stack.ts                              # GitHub OIDC + CI role (Phase 5.9)
│   ├── networking-stack.ts
│   ├── auth-stack.ts
│   ├── storage-stack.ts
│   ├── shared-services-stack.ts
│   ├── tenant-stack.ts
│   ├── dns-stack.ts
│   └── monitoring-stack.ts
├── scripts/
│   └── build-and-push.sh
├── cdk.json
├── tsconfig.json
└── package.json

apps/web/src/app/setup/
└── api-keys/page.tsx                         (new — Phase 8.7, API key onboarding step)

apps/web/src/app/api/tenant/
└── validate-key/route.ts                     (new — Phase 8.7, server-side key validation)

apps/web/src/app/(dashboard)/settings/general/_components/
└── api-keys-settings.tsx                     (new — Phase 8.7, settings API key management)

.github/workflows/
└── deploy.yml                                (new — Phase 5.10)
```

## Files to Modify

### Base repo

```
apps/web/src/app/layout.tsx                   (add auth provider)
apps/web/src/app/(dashboard)/layout.tsx       (add auth guard)
apps/web/src/app/setup/welcome/page.tsx       (update step flow — 1/5, nav to /setup/api-keys)
apps/web/src/app/setup/business/page.tsx      (step 3/5)
apps/web/src/app/setup/telegram/page.tsx      (step 4/5)
apps/web/src/app/setup/complete/page.tsx      (step 5/5)
apps/web/src/app/(dashboard)/settings/general/page.tsx (add ApiKeysSettings section)
apps/web/src/lib/squadhub/actions.ts          (add patchApiKeys server action)
apps/web/package.json                         (add @clawe/plugins, auth deps)
apps/web/src/lib/squadhub/connection.ts       (use getPlugin("squadhub-provisioner") result instead of env vars)
apps/web/src/app/api/tenant/provision/route.ts (use getPlugin + patch API keys after provisioning)
apps/web/src/app/api/squadhub/pairing/route.ts (use invokeTool instead of filesystem — Phase 8.8)
docker-compose.yml                            (remove ANTHROPIC_API_KEY, OPENAI_API_KEY from squadhub)
.env.example                                  (remove API key entries, add UI management note)
turbo.json                                    (remove API keys from globalPassThroughEnv)
scripts/start.sh                              (remove API key validation checks)
packages/backend/convex/schema.ts             (add openaiApiKey to tenants)
packages/backend/convex/tenants.ts            (setApiKeys mutation, getApiKeys query)
packages/shared/src/squadhub/pairing.ts       (remove filesystem-based functions — Phase 8.8)
docker/squadhub/Dockerfile                    (copy extensions to extensions dir — Phase 8.8)
docker/squadhub/templates/config.template.json (add plugins.load.paths — Phase 8.8)
pnpm-workspace.yaml                           (add packages/plugins)
package.json                                  (add workspace scripts)
```

### Cloud repo

```
apps/web/package.json                         (add @clawe/cloud-plugins)
apps/watcher/package.json                     (add aws-sdk for CloudMap)
docker/squadhub/entrypoint.sh                 (add agent registration on first start)
pnpm-workspace.yaml                           (add packages/cloud-plugins, infra/)
package.json                                  (add infra scripts)
```
