import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { resolveTenantId } from "./lib/auth";

export const list = query({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    return await ctx.db
      .query("channels")
      .withIndex("by_tenant_type", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

export const getByType = query({
  args: {
    machineToken: v.optional(v.string()),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    return await ctx.db
      .query("channels")
      .withIndex("by_tenant_type", (q) =>
        q.eq("tenantId", tenantId).eq("type", args.type),
      )
      .first();
  },
});

export const upsert = mutation({
  args: {
    machineToken: v.optional(v.string()),
    type: v.string(),
    status: v.union(v.literal("connected"), v.literal("disconnected")),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const { machineToken: _, ...rest } = args;

    const existing = await ctx.db
      .query("channels")
      .withIndex("by_tenant_type", (q) =>
        q.eq("tenantId", tenantId).eq("type", rest.type),
      )
      .first();

    const data = {
      type: rest.type,
      status: rest.status,
      metadata: rest.metadata,
      connectedAt: rest.status === "connected" ? Date.now() : undefined,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("channels", {
      ...data,
      tenantId,
    });
  },
});

export const disconnect = mutation({
  args: {
    machineToken: v.optional(v.string()),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);

    const existing = await ctx.db
      .query("channels")
      .withIndex("by_tenant_type", (q) =>
        q.eq("tenantId", tenantId).eq("type", args.type),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "disconnected",
        connectedAt: undefined,
      });
      return true;
    }

    return false;
  },
});
