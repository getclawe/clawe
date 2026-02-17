import { query, mutation } from "./_generated/server";
import { getUser, ensureAccountForUser } from "./lib/auth";

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
    return ensureAccountForUser(ctx, user);
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

/**
 * Check if onboarding is complete for the current user's account.
 * Returns false for new users who don't have an account yet.
 */
export const isOnboardingComplete = query({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await getUser(ctx);

      const membership = await ctx.db
        .query("accountMembers")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (!membership) {
        return false;
      }

      const account = await ctx.db.get(membership.accountId);
      return account?.onboardingComplete === true;
    } catch {
      // New user with no account — not onboarded
      return false;
    }
  },
});

/**
 * Mark onboarding as complete for the current user's account.
 */
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);

    const membership = await ctx.db
      .query("accountMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!membership) {
      throw new Error("No account found for user");
    }

    const account = await ctx.db.get(membership.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    await ctx.db.patch(membership.accountId, {
      onboardingComplete: true,
      updatedAt: Date.now(),
    });
  },
});
