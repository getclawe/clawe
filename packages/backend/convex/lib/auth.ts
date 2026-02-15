import type { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

type ReadCtx = { db: QueryCtx["db"]; auth: QueryCtx["auth"] };

const DEV_TENANT_EMAIL = "dev@clawe.local";

/**
 * Browser path: get the current user from JWT identity.
 * Looks up the `users` table by the email from the auth identity.
 */
export async function getUser(ctx: ReadCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const email = identity.email;
  if (!email) {
    throw new Error("No email in auth identity");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();

  if (!user) {
    throw new Error(`User not found for email: ${email}`);
  }

  return user;
}

/**
 * Resolve tenantId from user via accountMembers → accounts → tenants.
 * Used by both JWT and dev-mode paths.
 */
async function getTenantIdFromUser(
  ctx: ReadCtx,
  userId: Id<"users">,
): Promise<Id<"tenants"> | null> {
  const membership = await ctx.db
    .query("accountMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!membership) {
    return null;
  }

  const tenant = await ctx.db
    .query("tenants")
    .withIndex("by_account", (q) => q.eq("accountId", membership.accountId))
    .first();

  if (!tenant) {
    return null;
  }

  return tenant._id;
}

/**
 * Browser path: resolve tenantId from the JWT identity.
 * Gets the user, then looks up: accountMembers → account → tenants.
 */
export async function getTenantIdFromJwt(
  ctx: ReadCtx,
): Promise<Id<"tenants">> {
  const user = await getUser(ctx);

  const tenantId = await getTenantIdFromUser(ctx, user._id);

  if (!tenantId) {
    throw new Error("No tenant found for user");
  }

  return tenantId;
}

/**
 * Machine path (CLI): resolve tenantId from a per-tenant squadhub token.
 * Queries the `tenants` table by the `by_squadhubToken` index.
 */
export async function getTenantIdFromToken(
  ctx: ReadCtx,
  machineToken: string,
): Promise<Id<"tenants">> {
  const tenant = await ctx.db
    .query("tenants")
    .withIndex("by_squadhubToken", (q) => q.eq("squadhubToken", machineToken))
    .first();

  if (!tenant) {
    throw new Error("Invalid machine token");
  }

  return tenant._id;
}

/**
 * Machine path (watcher): validate system-level watcher token.
 * Compares against `WATCHER_TOKEN` Convex env var.
 */
export function validateWatcherToken(
  _ctx: ReadCtx,
  watcherToken: string,
): void {
  const expected = process.env.WATCHER_TOKEN;
  if (!expected || watcherToken !== expected) {
    throw new Error("Invalid watcher token");
  }
}

/**
 * Dev-only: get or create a default dev tenant (used when AUTH_ENABLED=false).
 */
async function getOrCreateDevTenant(
  ctx: MutationCtx,
): Promise<Id<"tenants">> {
  // Look for existing dev user
  let user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", DEV_TENANT_EMAIL))
    .first();

  if (!user) {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: DEV_TENANT_EMAIL,
      name: "Dev User",
      createdAt: now,
      updatedAt: now,
    });
    user = (await ctx.db.get(userId))!;
  }

  // Look for existing tenant via accountMembers → account → tenants
  const tenantId = await getTenantIdFromUser(ctx, user._id);
  if (tenantId) {
    return tenantId;
  }

  // Create account + accountMembers + tenant
  const now = Date.now();
  const accountId = await ctx.db.insert("accounts", {
    name: "Dev Account",
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.insert("accountMembers", {
    userId: user._id,
    accountId,
    role: "owner",
    createdAt: now,
  });

  const newTenantId = await ctx.db.insert("tenants", {
    accountId,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  return newTenantId;
}

/**
 * Unified tenant resolver for all tenant-scoped functions.
 *
 * Resolution order:
 * 1. If `machineToken` provided → look up tenant by squadhub token
 * 2. If `AUTH_ENABLED=true` → resolve from JWT identity
 * 3. If `AUTH_ENABLED=false` → get or create default dev tenant
 *
 * Use this in queries (read-only ctx) when AUTH_ENABLED is true or machineToken is provided.
 * Use `resolveTenantIdMut` in mutations when dev tenant auto-creation may be needed.
 */
export async function resolveTenantId(
  ctx: ReadCtx,
  args: { machineToken?: string },
): Promise<Id<"tenants">> {
  if (args.machineToken) {
    return getTenantIdFromToken(ctx, args.machineToken);
  }

  const authEnabled = process.env.AUTH_ENABLED !== "false";

  if (authEnabled) {
    return getTenantIdFromJwt(ctx);
  }

  // AUTH_ENABLED=false in a read-only context — try to find existing dev tenant
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", DEV_TENANT_EMAIL))
    .first();

  if (user) {
    const tenantId = await getTenantIdFromUser(ctx, user._id);
    if (tenantId) {
      return tenantId;
    }
  }

  throw new Error("No dev tenant found. Run a mutation first to auto-create it.");
}

/**
 * Mutation variant of resolveTenantId that can auto-create a dev tenant.
 * Use this in mutations instead of `resolveTenantId` when AUTH_ENABLED=false.
 */
export async function resolveTenantIdMut(
  ctx: MutationCtx,
  args: { machineToken?: string },
): Promise<Id<"tenants">> {
  if (args.machineToken) {
    return getTenantIdFromToken(ctx, args.machineToken);
  }

  const authEnabled = process.env.AUTH_ENABLED !== "false";

  if (authEnabled) {
    return getTenantIdFromJwt(ctx);
  }

  return getOrCreateDevTenant(ctx);
}
