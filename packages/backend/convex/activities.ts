import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveTenantId } from "./lib/auth";
import { getAgentBySessionKey } from "./lib/helpers";

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

    let activities;

    if (filters.taskId) {
      activities = await ctx.db
        .query("activities")
        .withIndex("by_tenant_task", (q) =>
          q.eq("tenantId", tenantId).eq("taskId", filters.taskId),
        )
        .order("desc")
        .take(limit);
    } else if (filters.agentId) {
      // No compound index for agentId — filter in JS
      const allActivities = await ctx.db
        .query("activities")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .order("desc")
        .collect();
      activities = allActivities
        .filter((a) => a.agentId === filters.agentId)
        .slice(0, limit);
    } else {
      activities = await ctx.db
        .query("activities")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .order("desc")
        .take(limit);
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

    return await ctx.db
      .query("activities")
      .withIndex("by_tenant_type", (q) =>
        q.eq("tenantId", tenantId).eq("type", filters.type),
      )
      .order("desc")
      .take(limit);
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
    const tenantId = await resolveTenantId(ctx, args);
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
    const tenantId = await resolveTenantId(ctx, args);
    const { machineToken: _, ...fields } = args;

    let agentId = undefined;

    if (fields.sessionKey) {
      const agent = await getAgentBySessionKey(
        ctx,
        tenantId,
        fields.sessionKey,
      );
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
