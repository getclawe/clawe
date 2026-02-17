import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReadCtx = { db: QueryCtx["db"]; auth: QueryCtx["auth"] };
type WriteCtx = { db: MutationCtx["db"] };

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
export async function getTenantIdFromJwt(ctx: ReadCtx): Promise<Id<"tenants">> {
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
 * Unified tenant resolver for all tenant-scoped functions.
 *
 * Resolution order:
 * 1. If `machineToken` provided → look up tenant by squadhub token
 * 2. Otherwise → resolve from JWT identity
 *
 * Works for both queries and mutations (only needs read access).
 */
export async function resolveTenantId(
  ctx: ReadCtx,
  args: { machineToken?: string },
): Promise<Id<"tenants">> {
  if (args.machineToken) {
    return getTenantIdFromToken(ctx, args.machineToken);
  }

  return getTenantIdFromJwt(ctx);
}

/**
 * Ensure an account and membership exist for the given user.
 * Returns the existing or newly created account.
 */
export async function ensureAccountForUser(
  ctx: ReadCtx & WriteCtx,
  user: Doc<"users">,
): Promise<Doc<"accounts">> {
  const membership = await ctx.db
    .query("accountMembers")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();

  if (membership) {
    const account = await ctx.db.get(membership.accountId);
    if (account) return account;
  }

  const now = Date.now();
  const accountId = await ctx.db.insert("accounts", {
    name: user.name ? `${user.name}'s Account` : undefined,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.insert("accountMembers", {
    userId: user._id,
    accountId,
    role: "owner",
    createdAt: now,
  });

  const account = await ctx.db.get(accountId);
  if (!account) throw new Error("Failed to create account");
  return account;
}
