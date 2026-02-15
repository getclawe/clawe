import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveTenantId, resolveTenantIdMut } from "./lib/auth";

// List messages for a task
export const listForTask = query({
  args: { taskId: v.id("tasks"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const messages = allMessages.filter((m) => m.taskId === args.taskId);

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
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    const agent = agents.find((a) => a.sessionKey === args.sessionKey);

    if (!agent) {
      return [];
    }

    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const agentMessages = allMessages
      .filter((m) => m.fromAgentId === agent._id)
      .sort((a, b) => b.createdAt - a.createdAt);

    return args.limit ? agentMessages.slice(0, args.limit) : agentMessages;
  },
});

// Get recent messages
export const recent = query({
  args: { limit: v.optional(v.number()), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const limit = args.limit ?? 50;

    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const messages = allMessages
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

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
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantIdMut(ctx, args);
    const { machineToken: _, ...rest } = args;
    const now = Date.now();

    let fromAgentId = undefined;
    if (rest.fromSessionKey) {
      const sessionKey = rest.fromSessionKey;
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sessionKey))
        .first();
      if (agent) {
        fromAgentId = agent._id;
      }
    }

    const messageId = await ctx.db.insert("messages", {
      tenantId,
      taskId: rest.taskId,
      fromAgentId,
      humanAuthor: rest.humanAuthor,
      type: rest.type ?? "comment",
      content: rest.content,
      createdAt: now,
    });

    // Update task timestamp if linked to a task
    if (rest.taskId) {
      await ctx.db.patch(rest.taskId, { updatedAt: now });
    }

    return messageId;
  },
});

// Delete a message
export const remove = mutation({
  args: { id: v.id("messages"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await resolveTenantIdMut(ctx, args);
    await ctx.db.delete(args.id);
  },
});
