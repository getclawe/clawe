import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";

// Generate upload URL for file storage
export const generateUploadUrl = action({
  args: {},
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
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    if (args.type) {
      const type = args.type;
      return await ctx.db
        .query("documents")
        .withIndex("by_type", (q) => q.eq("type", type))
        .order("desc")
        .take(limit);
    }

    return await ctx.db.query("documents").order("desc").take(limit);
  },
});

// Get documents for a task (deliverables)
export const getForTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
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
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the creator agent
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) =>
        q.eq("sessionKey", args.createdBySessionKey),
      )
      .first();

    if (!agent) {
      throw new Error(`Agent not found: ${args.createdBySessionKey}`);
    }

    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      content: args.content,
      path: args.path,
      type: args.type,
      taskId: args.taskId,
      createdBy: agent._id,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "document_created",
      agentId: agent._id,
      taskId: args.taskId,
      message: `${agent.name} created ${args.type}: ${args.title}`,
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) =>
        q.eq("sessionKey", args.createdBySessionKey),
      )
      .first();

    if (!agent) {
      throw new Error(`Agent not found: ${args.createdBySessionKey}`);
    }

    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      path: args.path,
      fileId: args.fileId,
      type: "deliverable",
      taskId: args.taskId,
      createdBy: agent._id,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "document_created",
      agentId: agent._id,
      taskId: args.taskId,
      message: `${agent.name} registered deliverable: ${args.title}`,
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
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
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
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
