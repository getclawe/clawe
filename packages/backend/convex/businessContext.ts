import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { resolveTenantId, resolveTenantIdMut } from "./lib/auth";

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
 * Check if business context is configured and approved.
 */
export const isConfigured = query({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const context = await ctx.db
      .query("businessContext")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();
    return context?.approved === true;
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
    approved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantIdMut(ctx, args);
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
      approved: rest.approved ?? false,
      approvedAt: rest.approved ? now : undefined,
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
 * Mark the current business context as approved.
 */
export const approve = mutation({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantIdMut(ctx, args);
    const existing = await ctx.db
      .query("businessContext")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    if (!existing) {
      throw new Error("No business context to approve");
    }

    await ctx.db.patch(existing._id, {
      approved: true,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return existing._id;
  },
});

/**
 * Clear the business context.
 * Used for resetting onboarding.
 */
export const clear = mutation({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantIdMut(ctx, args);
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
