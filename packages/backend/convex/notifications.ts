import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get undelivered notifications for an agent (by session key)
export const getUndelivered = query({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    // Find the agent
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!agent) {
      return [];
    }

    // Get undelivered notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_target_undelivered", (q) =>
        q.eq("targetAgentId", agent._id).eq("delivered", false),
      )
      .collect();

    // Enrich with source agent and task info
    return Promise.all(
      notifications.map(async (n) => {
        let sourceAgent = null;
        let task = null;

        if (n.sourceAgentId) {
          sourceAgent = await ctx.db.get(n.sourceAgentId);
        }
        if (n.taskId) {
          task = await ctx.db.get(n.taskId);
        }

        return {
          ...n,
          sourceAgent: sourceAgent
            ? {
                _id: sourceAgent._id,
                name: sourceAgent.name,
                emoji: sourceAgent.emoji,
              }
            : null,
          task: task
            ? { _id: task._id, title: task.title, status: task.status }
            : null,
        };
      }),
    );
  },
});

// Get all notifications for an agent
export const getForAgent = query({
  args: {
    sessionKey: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!agent) {
      return [];
    }

    let query = ctx.db
      .query("notifications")
      .withIndex("by_target", (q) => q.eq("targetAgentId", agent._id))
      .order("desc");

    const notifications = args.limit
      ? await query.take(args.limit)
      : await query.collect();

    return notifications;
  },
});

// Mark notifications as delivered
export const markDelivered = mutation({
  args: {
    notificationIds: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const id of args.notificationIds) {
      await ctx.db.patch(id, {
        delivered: true,
        deliveredAt: now,
      });
    }
  },
});

// Send a notification to an agent
export const send = mutation({
  args: {
    targetSessionKey: v.string(),
    sourceSessionKey: v.optional(v.string()),
    type: v.union(
      v.literal("task_assigned"),
      v.literal("task_mentioned"),
      v.literal("task_completed"),
      v.literal("message_received"),
      v.literal("review_requested"),
      v.literal("blocked"),
      v.literal("custom"),
    ),
    taskId: v.optional(v.id("tasks")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const targetKey = args.targetSessionKey;

    // Find target agent
    const targetAgent = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", targetKey))
      .first();

    if (!targetAgent) {
      throw new Error(`Target agent not found: ${args.targetSessionKey}`);
    }

    // Find source agent if provided
    let sourceAgentId = undefined;
    if (args.sourceSessionKey) {
      const sourceKey = args.sourceSessionKey;
      const sourceAgent = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sourceKey))
        .first();
      if (sourceAgent) {
        sourceAgentId = sourceAgent._id;
      }
    }

    // Create notification
    const notificationId = await ctx.db.insert("notifications", {
      targetAgentId: targetAgent._id,
      sourceAgentId,
      type: args.type,
      taskId: args.taskId,
      content: args.content,
      delivered: false,
      createdAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "notification_sent",
      agentId: sourceAgentId,
      taskId: args.taskId,
      message: `Notification sent to ${targetAgent.name}: ${args.content.slice(0, 50)}...`,
      createdAt: now,
    });

    return notificationId;
  },
});

// Send notification to multiple agents
export const sendToMany = mutation({
  args: {
    targetSessionKeys: v.array(v.string()),
    sourceSessionKey: v.optional(v.string()),
    type: v.union(
      v.literal("task_assigned"),
      v.literal("task_mentioned"),
      v.literal("task_completed"),
      v.literal("message_received"),
      v.literal("review_requested"),
      v.literal("blocked"),
      v.literal("custom"),
    ),
    taskId: v.optional(v.id("tasks")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const notificationIds: string[] = [];

    // Find source agent if provided
    let sourceAgentId = undefined;
    if (args.sourceSessionKey) {
      const sourceKey = args.sourceSessionKey;
      const sourceAgent = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sourceKey))
        .first();
      if (sourceAgent) {
        sourceAgentId = sourceAgent._id;
      }
    }

    for (const targetSessionKey of args.targetSessionKeys) {
      const targetAgent = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", targetSessionKey))
        .first();

      if (targetAgent) {
        const id = await ctx.db.insert("notifications", {
          targetAgentId: targetAgent._id,
          sourceAgentId,
          type: args.type,
          taskId: args.taskId,
          content: args.content,
          delivered: false,
          createdAt: now,
        });
        notificationIds.push(id);
      }
    }

    return notificationIds;
  },
});

// Clear all notifications for an agent (mark all as delivered)
export const clearAll = mutation({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!agent) {
      return 0;
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_target_undelivered", (q) =>
        q.eq("targetAgentId", agent._id).eq("delivered", false),
      )
      .collect();

    const now = Date.now();
    for (const n of notifications) {
      await ctx.db.patch(n._id, {
        delivered: true,
        deliveredAt: now,
      });
    }

    return notifications.length;
  },
});
