import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { resolveTenantId } from "./lib/auth";

/**
 * Get the current business context.
 * Returns null if not configured.
 */
export const get = query({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    return await ctx.db
      .query("businessContext")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();
  },
});

/**
 * Check if business context is configured.
 * Returns true if a businessContext record exists for the tenant.
 */
export const isConfigured = query({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const context = await ctx.db
      .query("businessContext")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();
    return context !== null;
  },
});

/**
 * Save or update business context.
 * Used by Clawe CLI during onboarding.
 */
export const save = mutation({
  args: {
    machineToken: v.optional(v.string()),
    url: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    favicon: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        title: v.optional(v.string()),
        ogImage: v.optional(v.string()),
        industry: v.optional(v.string()),
        keywords: v.optional(v.array(v.string())),
        targetAudience: v.optional(v.string()),
        tone: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const { machineToken: _, ...rest } = args;
    const now = Date.now();
    const existing = await ctx.db
      .query("businessContext")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    const data = {
      url: rest.url,
      name: rest.name,
      description: rest.description,
      favicon: rest.favicon,
      metadata: rest.metadata,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("businessContext", {
      ...data,
      tenantId,
      createdAt: now,
    });
  },
});

/**
 * Clear the business context.
 * Used for resetting onboarding.
 */
export const clear = mutation({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const existing = await ctx.db
      .query("businessContext")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }

    return false;
  },
});
