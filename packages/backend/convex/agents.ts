import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all agents
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("agents")
      .collect();
  },
});

// Get agent by ID
export const get = query({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get agent by session key
export const getBySessionKey = query({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();
  },
});

// List agents by status
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("idle"),
      v.literal("active"),
      v.literal("blocked")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

// Squad status - get all agents with their current state
export const squad = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    
    return Promise.all(
      agents.map(async (agent) => {
        let currentTask = null;
        if (agent.currentTaskId) {
          currentTask = await ctx.db.get(agent.currentTaskId);
        }
        return {
          ...agent,
          currentTask: currentTask
            ? { _id: currentTask._id, title: currentTask.title, status: currentTask.status }
            : null,
        };
      })
    );
  },
});

// Register or update an agent (upsert by sessionKey)
export const upsert = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    sessionKey: v.string(),
    emoji: v.optional(v.string()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if agent exists
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();
    
    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        name: args.name,
        role: args.role,
        emoji: args.emoji,
        config: args.config,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new
      return await ctx.db.insert("agents", {
        name: args.name,
        role: args.role,
        sessionKey: args.sessionKey,
        emoji: args.emoji,
        config: args.config,
        status: "idle",
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Create a new agent
export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    sessionKey: v.string(),
    emoji: v.optional(v.string()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("agents", {
      name: args.name,
      role: args.role,
      sessionKey: args.sessionKey,
      emoji: args.emoji,
      config: args.config,
      status: "idle",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update agent status
export const updateStatus = mutation({
  args: {
    id: v.id("agents"),
    status: v.union(
      v.literal("idle"),
      v.literal("active"),
      v.literal("blocked")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

// Record agent heartbeat
export const heartbeat = mutation({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();
    
    if (!agent) {
      throw new Error(`Agent not found: ${args.sessionKey}`);
    }
    
    await ctx.db.patch(agent._id, {
      lastHeartbeat: now,
      lastSeen: now,
      presenceStatus: "online",
      updatedAt: now,
    });
    
    // Log heartbeat activity
    await ctx.db.insert("activities", {
      type: "agent_heartbeat",
      agentId: agent._id,
      message: `${agent.name} checked in`,
      createdAt: now,
    });
    
    return agent._id;
  },
});

// Update agent's current task
export const setCurrentTask = mutation({
  args: {
    sessionKey: v.string(),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();
    
    if (!agent) {
      throw new Error(`Agent not found: ${args.sessionKey}`);
    }
    
    await ctx.db.patch(agent._id, {
      currentTaskId: args.taskId,
      status: args.taskId ? "active" : "idle",
      updatedAt: Date.now(),
    });
  },
});

// Update agent's current activity description
export const setActivity = mutation({
  args: {
    sessionKey: v.string(),
    activity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();
    
    if (!agent) {
      throw new Error(`Agent not found: ${args.sessionKey}`);
    }
    
    await ctx.db.patch(agent._id, {
      currentActivity: args.activity,
      lastSeen: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update agent
export const update = mutation({
  args: {
    id: v.id("agents"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    emoji: v.optional(v.string()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );
    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Remove agent
export const remove = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
