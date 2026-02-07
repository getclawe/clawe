import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List messages for a task
export const listForTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    // Enrich with author info
    return Promise.all(
      messages.map(async (m) => {
        let author = null;
        if (m.fromAgentId) {
          const agent = await ctx.db.get(m.fromAgentId);
          author = agent
            ? {
                _id: agent._id,
                name: agent.name,
                emoji: agent.emoji,
                isHuman: false,
              }
            : null;
        } else if (m.humanAuthor) {
          author = { name: m.humanAuthor, emoji: "👤", isHuman: true };
        }
        return { ...m, author };
      }),
    );
  },
});

// List messages by agent
export const listByAgent = query({
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
      .query("messages")
      .withIndex("by_agent", (q) => q.eq("fromAgentId", agent._id))
      .order("desc");

    return args.limit ? await query.take(args.limit) : await query.collect();
  },
});

// Get recent messages
export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_created")
      .order("desc")
      .take(limit);

    // Enrich with author and task info
    return Promise.all(
      messages.map(async (m) => {
        let author = null;
        let task = null;

        if (m.fromAgentId) {
          const agent = await ctx.db.get(m.fromAgentId);
          author = agent
            ? { _id: agent._id, name: agent.name, emoji: agent.emoji }
            : null;
        } else if (m.humanAuthor) {
          author = { name: m.humanAuthor, emoji: "👤", isHuman: true };
        }

        if (m.taskId) {
          task = await ctx.db.get(m.taskId);
        }

        return {
          ...m,
          author,
          task: task ? { _id: task._id, title: task.title } : null,
        };
      }),
    );
  },
});

// Create a message (comment on task)
export const create = mutation({
  args: {
    taskId: v.optional(v.id("tasks")),
    content: v.string(),
    type: v.optional(
      v.union(
        v.literal("comment"),
        v.literal("status_change"),
        v.literal("system"),
      ),
    ),
    fromSessionKey: v.optional(v.string()),
    humanAuthor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    let fromAgentId = undefined;
    if (args.fromSessionKey) {
      const sessionKey = args.fromSessionKey;
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sessionKey))
        .first();
      if (agent) {
        fromAgentId = agent._id;
      }
    }

    const messageId = await ctx.db.insert("messages", {
      taskId: args.taskId,
      fromAgentId,
      humanAuthor: args.humanAuthor,
      type: args.type ?? "comment",
      content: args.content,
      createdAt: now,
    });

    // Update task timestamp if linked to a task
    if (args.taskId) {
      await ctx.db.patch(args.taskId, { updatedAt: now });
    }

    return messageId;
  },
});

// Delete a message
export const remove = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
