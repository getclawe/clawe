import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { resolveTenantId } from "./lib/auth";
import { getAgentBySessionKey } from "./lib/helpers";

// Generate upload URL for file storage
export const generateUploadUrl = action({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// List all documents
export const list = query({
  args: {
    type: v.optional(
      v.union(
        v.literal("deliverable"),
        v.literal("research"),
        v.literal("reference"),
        v.literal("note"),
      ),
    ),
    limit: v.optional(v.number()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const limit = args.limit ?? 100;

    let docsQuery;
    const type = args.type;
    if (type) {
      docsQuery = ctx.db
        .query("documents")
        .withIndex("by_tenant_type", (q) =>
          q.eq("tenantId", tenantId).eq("type", type),
        )
        .order("desc");
    } else {
      docsQuery = ctx.db
        .query("documents")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .order("desc");
    }

    return await docsQuery.take(limit);
  },
});

// Get documents for a task (deliverables)
export const getForTask = query({
  args: { taskId: v.id("tasks"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.tenantId !== tenantId) return [];

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_tenant_task", (q) =>
        q.eq("tenantId", tenantId).eq("taskId", args.taskId),
      )
      .collect();

    // Enrich with creator info and file URL
    return Promise.all(
      documents.map(async (doc) => {
        const creator = await ctx.db.get(doc.createdBy);
        const fileUrl = doc.fileId
          ? await ctx.storage.getUrl(doc.fileId)
          : null;

        return {
          ...doc,
          fileUrl,
          creator: creator
            ? { _id: creator._id, name: creator.name, emoji: creator.emoji }
            : null,
        };
      }),
    );
  },
});

// Get document by ID
export const get = query({
  args: { id: v.id("documents"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.tenantId !== tenantId) return null;
    return doc;
  },
});

// Create a document / register a deliverable
export const create = mutation({
  args: {
    title: v.string(),
    content: v.optional(v.string()),
    path: v.optional(v.string()),
    type: v.union(
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("reference"),
      v.literal("note"),
    ),
    taskId: v.optional(v.id("tasks")),
    createdBySessionKey: v.string(),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const { machineToken: _, ...rest } = args;
    const now = Date.now();

    // Find the creator agent
    const agent = await getAgentBySessionKey(
      ctx,
      tenantId,
      rest.createdBySessionKey,
    );

    if (!agent) {
      throw new Error(`Agent not found: ${rest.createdBySessionKey}`);
    }

    const documentId = await ctx.db.insert("documents", {
      title: rest.title,
      content: rest.content,
      path: rest.path,
      type: rest.type,
      taskId: rest.taskId,
      createdBy: agent._id,
      tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "document_created",
      agentId: agent._id,
      taskId: rest.taskId,
      message: `${agent.name} created ${rest.type}: ${rest.title}`,
      tenantId,
      createdAt: now,
    });

    return documentId;
  },
});

// Register a deliverable (convenience alias)
export const registerDeliverable = mutation({
  args: {
    title: v.string(),
    path: v.string(),
    fileId: v.optional(v.id("_storage")),
    taskId: v.id("tasks"),
    createdBySessionKey: v.string(),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const { machineToken: _, ...rest } = args;
    const now = Date.now();

    const agent = await getAgentBySessionKey(
      ctx,
      tenantId,
      rest.createdBySessionKey,
    );

    if (!agent) {
      throw new Error(`Agent not found: ${rest.createdBySessionKey}`);
    }

    const documentId = await ctx.db.insert("documents", {
      title: rest.title,
      path: rest.path,
      fileId: rest.fileId,
      type: "deliverable",
      taskId: rest.taskId,
      createdBy: agent._id,
      tenantId,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "document_created",
      agentId: agent._id,
      taskId: rest.taskId,
      message: `${agent.name} registered deliverable: ${rest.title}`,
      tenantId,
      createdAt: now,
    });

    return documentId;
  },
});

// Update a document
export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    path: v.optional(v.string()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.tenantId !== tenantId) throw new Error("Not found");

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

// Delete a document
export const remove = mutation({
  args: { id: v.id("documents"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.tenantId !== tenantId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
