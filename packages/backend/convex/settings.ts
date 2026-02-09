import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("settings", {
      key: args.key,
      value: args.value,
      updatedAt: Date.now(),
    });
  },
});

export const isOnboardingComplete = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "onboarding_complete"))
      .first();
    return setting?.value === true;
  },
});

export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "onboarding_complete"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: true,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("settings", {
      key: "onboarding_complete",
      value: true,
      updatedAt: Date.now(),
    });
  },
});

// Timezone settings
const DEFAULT_TIMEZONE = "America/New_York";

export const getTimezone = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "timezone"))
      .first();
    return (setting?.value as string) ?? DEFAULT_TIMEZONE;
  },
});

export const setTimezone = mutation({
  args: { timezone: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "timezone"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.timezone,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("settings", {
      key: "timezone",
      value: args.timezone,
      updatedAt: Date.now(),
    });
  },
});
