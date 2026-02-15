import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveTenantId, resolveTenantIdMut } from "./lib/auth";

// Get activity feed (most recent first)
export const feed = query({
  args: {
    limit: v.optional(v.number()),
    agentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const { machineToken: _, ...filters } = args;
    const limit = filters.limit ?? 50;

    // Always query by tenant first, then filter in JS
    const allActivities = await ctx.db
      .query("activities")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .collect();

    let activities;

    if (filters.taskId) {
      activities = allActivities
        .filter((a) => a.taskId === filters.taskId)
        .slice(0, limit);
    } else if (filters.agentId) {
      activities = allActivities
        .filter((a) => a.agentId === filters.agentId)
        .slice(0, limit);
    } else {
      activities = allActivities.slice(0, limit);
    }

    // Enrich with agent and task info
    return Promise.all(
      activities.map(async (activity) => {
        let agent = null;
        let task = null;

        if (activity.agentId) {
          agent = await ctx.db.get(activity.agentId);
        }
        if (activity.taskId) {
          task = await ctx.db.get(activity.taskId);
        }

        return {
          ...activity,
          agent: agent
            ? { _id: agent._id, name: agent.name, emoji: agent.emoji }
            : null,
          task: task
            ? { _id: task._id, title: task.title, status: task.status }
            : null,
        };
      }),
    );
  },
});

// Get activities by type
export const byType = query({
  args: {
    type: v.union(
      v.literal("task_created"),
      v.literal("task_assigned"),
      v.literal("task_status_changed"),
      v.literal("subtask_completed"),
      v.literal("message_sent"),
      v.literal("document_created"),
      v.literal("agent_heartbeat"),
      v.literal("notification_sent"),
    ),
    limit: v.optional(v.number()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const { machineToken: _, ...filters } = args;
    const limit = filters.limit ?? 50;

    // Query by tenant first, then filter by type in JS
    const allActivities = await ctx.db
      .query("activities")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .collect();

    return allActivities
      .filter((a) => a.type === filters.type)
      .slice(0, limit);
  },
});

// Log an activity
export const log = mutation({
  args: {
    type: v.union(
      v.literal("task_created"),
      v.literal("task_assigned"),
      v.literal("task_status_changed"),
      v.literal("subtask_completed"),
      v.literal("message_sent"),
      v.literal("document_created"),
      v.literal("agent_heartbeat"),
      v.literal("notification_sent"),
    ),
    agentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    message: v.string(),
    metadata: v.optional(v.any()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantIdMut(ctx, args);
    const { machineToken: _, ...fields } = args;

    return await ctx.db.insert("activities", {
      tenantId,
      type: fields.type,
      agentId: fields.agentId,
      taskId: fields.taskId,
      message: fields.message,
      metadata: fields.metadata,
      createdAt: Date.now(),
    });
  },
});

// Log activity by session key (convenience for CLI)
export const logBySession = mutation({
  args: {
    type: v.union(
      v.literal("task_created"),
      v.literal("task_assigned"),
      v.literal("task_status_changed"),
      v.literal("subtask_completed"),
      v.literal("message_sent"),
      v.literal("document_created"),
      v.literal("agent_heartbeat"),
      v.literal("notification_sent"),
    ),
    sessionKey: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    message: v.string(),
    metadata: v.optional(v.any()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantIdMut(ctx, args);
    const { machineToken: _, ...fields } = args;

    let agentId = undefined;

    if (fields.sessionKey) {
      const sessionKey = fields.sessionKey;
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sessionKey))
        .first();
      if (agent) {
        agentId = agent._id;
      }
    }

    return await ctx.db.insert("activities", {
      tenantId,
      type: fields.type,
      agentId,
      taskId: fields.taskId,
      message: fields.message,
      metadata: fields.metadata,
      createdAt: Date.now(),
    });
  },
});
