import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveTenantId } from "./lib/auth";
import { getAgentBySessionKey } from "./lib/helpers";

const agentStatusValidator = v.union(v.literal("online"), v.literal("offline"));

// List all agents
export const list = query({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    return await ctx.db
      .query("agents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

// Get agent by ID
export const get = query({
  args: { id: v.id("agents"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const agent = await ctx.db.get(args.id);
    if (!agent || agent.tenantId !== tenantId) return null;
    return agent;
  },
});

// Get agent by session key
export const getBySessionKey = query({
  args: { sessionKey: v.string(), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    return await getAgentBySessionKey(ctx, tenantId, args.sessionKey);
  },
});

// List agents by status
export const listByStatus = query({
  args: { status: agentStatusValidator, machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    return await ctx.db
      .query("agents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", args.status),
      )
      .collect();
  },
});

// Squad status - get all agents with their current state
export const squad = query({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    return Promise.all(
      agents.map(async (agent) => {
        let currentTask = null;
        if (agent.currentTaskId) {
          currentTask = await ctx.db.get(agent.currentTaskId);
        }
        return {
          ...agent,
          currentTask: currentTask
            ? {
                _id: currentTask._id,
                title: currentTask.title,
                status: currentTask.status,
              }
            : null,
        };
      }),
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
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const { machineToken: _, ...rest } = args;
    const now = Date.now();

    const existing = await getAgentBySessionKey(ctx, tenantId, rest.sessionKey);

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: rest.name,
        role: rest.role,
        emoji: rest.emoji,
        config: rest.config,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("agents", {
        name: rest.name,
        role: rest.role,
        sessionKey: rest.sessionKey,
        emoji: rest.emoji,
        config: rest.config,
        status: "offline",
        tenantId,
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
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const { machineToken: _, ...rest } = args;
    const now = Date.now();
    return await ctx.db.insert("agents", {
      name: rest.name,
      role: rest.role,
      sessionKey: rest.sessionKey,
      emoji: rest.emoji,
      config: rest.config,
      status: "offline",
      tenantId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update agent status
export const updateStatus = mutation({
  args: {
    id: v.id("agents"),
    status: agentStatusValidator,
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const agent = await ctx.db.get(args.id);
    if (!agent || agent.tenantId !== tenantId) {
      throw new Error("Not found");
    }
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

// Record agent heartbeat
export const heartbeat = mutation({
  args: { sessionKey: v.string(), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const now = Date.now();

    const agent = await getAgentBySessionKey(ctx, tenantId, args.sessionKey);

    if (!agent) {
      throw new Error(`Agent not found: ${args.sessionKey}`);
    }

    const ONLINE_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutes
    const wasOffline =
      !agent.lastHeartbeat || now - agent.lastHeartbeat > ONLINE_THRESHOLD_MS;

    await ctx.db.patch(agent._id, {
      lastHeartbeat: now,
      lastSeen: now,
      status: "online",
      updatedAt: now,
    });

    if (wasOffline) {
      await ctx.db.insert("activities", {
        type: "agent_heartbeat",
        agentId: agent._id,
        message: `${agent.name} is online`,
        tenantId: agent.tenantId,
        createdAt: now,
      });
    }

    return agent._id;
  },
});

// Update agent's current task
export const setCurrentTask = mutation({
  args: {
    sessionKey: v.string(),
    taskId: v.optional(v.id("tasks")),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const agent = await getAgentBySessionKey(ctx, tenantId, args.sessionKey);

    if (!agent) {
      throw new Error(`Agent not found: ${args.sessionKey}`);
    }

    await ctx.db.patch(agent._id, {
      currentTaskId: args.taskId,
      updatedAt: Date.now(),
    });
  },
});

// Update agent's current activity description
export const setActivity = mutation({
  args: {
    sessionKey: v.string(),
    activity: v.optional(v.string()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const agent = await getAgentBySessionKey(ctx, tenantId, args.sessionKey);

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
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const agent = await ctx.db.get(args.id);
    if (!agent || agent.tenantId !== tenantId) {
      throw new Error("Not found");
    }
    const { id, machineToken: _, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );
    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Remove agent
export const remove = mutation({
  args: { id: v.id("agents"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const agent = await ctx.db.get(args.id);
    if (!agent || agent.tenantId !== tenantId) {
      throw new Error("Not found");
    }
    await ctx.db.delete(args.id);
  },
});
