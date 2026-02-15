import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { resolveTenantId, resolveTenantIdMut } from "./lib/auth";

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
    const tenantId = await resolveTenantIdMut(ctx, args);
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

// Check if onboarding is complete for the current tenant
export const isOnboardingComplete = query({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const tenant = await ctx.db.get(tenantId);
    return tenant?.settings?.onboardingComplete === true;
  },
});

// Mark onboarding as complete for the current tenant
export const completeOnboarding = mutation({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantIdMut(ctx, args);
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    await ctx.db.patch(tenantId, {
      settings: {
        ...tenant.settings,
        onboardingComplete: true,
      },
      updatedAt: Date.now(),
    });
  },
});
