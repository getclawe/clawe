import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get activity feed (most recent first)
export const feed = query({
  args: {
    limit: v.optional(v.number()),
    agentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let activities;

    if (args.taskId) {
      // Filter by task
      activities = await ctx.db
        .query("activities")
        .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
        .order("desc")
        .take(limit);
    } else if (args.agentId) {
      // Filter by agent
      activities = await ctx.db
        .query("activities")
        .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
        .order("desc")
        .take(limit);
    } else {
      // All activities
      activities = await ctx.db
        .query("activities")
        .withIndex("by_createdAt")
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
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("activities")
      .withIndex("by_type", (q) => q.eq("type", args.type))
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activities", {
      type: args.type,
      agentId: args.agentId,
      taskId: args.taskId,
      message: args.message,
      metadata: args.metadata,
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
  },
  handler: async (ctx, args) => {
    let agentId = undefined;

    if (args.sessionKey) {
      const sessionKey = args.sessionKey;
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sessionKey))
        .first();
      if (agent) {
        agentId = agent._id;
      }
    }

    return await ctx.db.insert("activities", {
      type: args.type,
      agentId,
      taskId: args.taskId,
      message: args.message,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});
