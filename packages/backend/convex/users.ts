import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ensureAccountForUser } from "./lib/auth";

export const getOrCreateFromAuth = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const email = identity.email;
    if (!email) {
      throw new Error("No email in auth identity");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    const now = Date.now();

    let user = existing;
    if (!user) {
      const userId = await ctx.db.insert("users", {
        email,
        name: identity.name ?? undefined,
        createdAt: now,
        updatedAt: now,
      });
      const created = await ctx.db.get(userId);
      if (!created) throw new Error("Failed to create user");
      user = created;
    }

    // Ensure account + membership exist
    await ensureAccountForUser(ctx, user);

    return user;
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const email = identity.email;
    if (!email) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

export const update = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
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
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});
