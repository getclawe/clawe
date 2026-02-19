import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  ensureAccountForUser,
  getUser,
  getTenantIdFromJwt,
  resolveTenantId,
  validateWatcherToken,
} from "./lib/auth";

const DEFAULT_TIMEZONE = "America/New_York";

// Get timezone for the current tenant
export const getTimezone = query({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const tenant = await ctx.db.get(tenantId);
    return tenant?.settings?.timezone ?? DEFAULT_TIMEZONE;
  },
});

// Set timezone for the current tenant
export const setTimezone = mutation({
  args: {
    machineToken: v.optional(v.string()),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    await ctx.db.patch(tenantId, {
      settings: {
        ...tenant.settings,
        timezone: args.timezone,
      },
      updatedAt: Date.now(),
    });
  },
});

// Create a new tenant within an account
export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    const account = await ensureAccountForUser(ctx, user);

    // Idempotent: return existing tenant if one exists
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .first();
    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert("tenants", {
      accountId: account._id,
      status: "provisioning",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get tenant for the current authenticated user
// Resolves: user → accountMembers → account → tenants
export const getForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);

    const membership = await ctx.db
      .query("accountMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!membership) {
      return null;
    }

    return await ctx.db
      .query("tenants")
      .withIndex("by_account", (q) => q.eq("accountId", membership.accountId))
      .first();
  },
});

// Update tenant provisioning status
export const updateStatus = mutation({
  args: {
    status: v.union(
      v.literal("provisioning"),
      v.literal("active"),
      v.literal("stopped"),
      v.literal("error"),
    ),
    squadhubUrl: v.optional(v.string()),
    squadhubToken: v.optional(v.string()),
    squadhubServiceArn: v.optional(v.string()),
    efsAccessPointId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await getTenantIdFromJwt(ctx);
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    await ctx.db.patch(tenantId, {
      status: args.status,
      ...(args.squadhubUrl !== undefined && {
        squadhubUrl: args.squadhubUrl,
      }),
      ...(args.squadhubToken !== undefined && {
        squadhubToken: args.squadhubToken,
      }),
      ...(args.squadhubServiceArn !== undefined && {
        squadhubServiceArn: args.squadhubServiceArn,
      }),
      ...(args.efsAccessPointId !== undefined && {
        efsAccessPointId: args.efsAccessPointId,
      }),
      updatedAt: Date.now(),
    });
  },
});

// Store API keys in tenant record
export const setApiKeys = mutation({
  args: {
    machineToken: v.optional(v.string()),
    anthropicApiKey: v.optional(v.string()),
    openaiApiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.anthropicApiKey !== undefined) {
      patch.anthropicApiKey = args.anthropicApiKey;
    }
    if (args.openaiApiKey !== undefined) {
      patch.openaiApiKey = args.openaiApiKey;
    }

    await ctx.db.patch(tenantId, patch);
  },
});

// Get masked API keys for display (last 4 chars only)
export const getApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);

    const membership = await ctx.db
      .query("accountMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!membership)
      return { anthropicApiKey: undefined, openaiApiKey: undefined };

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_account", (q) => q.eq("accountId", membership.accountId))
      .first();

    if (!tenant) return { anthropicApiKey: undefined, openaiApiKey: undefined };

    const mask = (key: string | undefined) => {
      if (!key) return undefined;
      const last4 = key.slice(-4);
      return `${"*".repeat(Math.max(0, key.length - 4))}${last4}`;
    };

    return {
      anthropicApiKey: mask(tenant.anthropicApiKey),
      openaiApiKey: mask(tenant.openaiApiKey),
    };
  },
});

// List all active tenants with their squadhub connection info
// Requires a valid WATCHER_TOKEN for system-level auth
export const listActive = query({
  args: {
    watcherToken: v.string(),
  },
  handler: async (ctx, args) => {
    validateWatcherToken(ctx, args.watcherToken);

    const tenants = await ctx.db
      .query("tenants")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return tenants
      .filter((t) => t.squadhubUrl && t.squadhubToken)
      .map((t) => ({
        id: t._id,
        squadhubUrl: t.squadhubUrl!,
        squadhubToken: t.squadhubToken!,
      }));
  },
});
