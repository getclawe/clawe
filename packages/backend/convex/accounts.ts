import { query, mutation } from "./_generated/server";
import { getUser } from "./lib/auth";

/**
 * Get or create an account for the current authenticated user.
 * Called during provisioning or first login.
 * If the user already has an account membership, returns that account.
 * Otherwise, creates a new account and membership.
 */
export const getOrCreateForUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);

    // Check for existing account membership
    const membership = await ctx.db
      .query("accountMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (membership) {
      return (await ctx.db.get(membership.accountId))!;
    }

    // Create new account + membership
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

    return (await ctx.db.get(accountId))!;
  },
});

/**
 * Get the account for the current authenticated user.
 * Returns null if the user has no account membership.
 */
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

    return await ctx.db.get(membership.accountId);
  },
});
