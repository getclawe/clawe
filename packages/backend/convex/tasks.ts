import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// List all tasks with optional filters
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("inbox"),
        v.literal("assigned"),
        v.literal("in_progress"),
        v.literal("review"),
        v.literal("done"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let tasks;

    if (args.status) {
      const status = args.status;
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .collect();
    } else {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_createdAt")
        .order("desc")
        .collect();
    }

    if (args.limit) {
      tasks = tasks.slice(0, args.limit);
    }

    // Enrich with assignee info and document count
    return Promise.all(
      tasks.map(async (task) => {
        const assignees = task.assigneeIds
          ? await Promise.all(task.assigneeIds.map((id) => ctx.db.get(id)))
          : [];

        const validAssignees = assignees.filter(
          (a): a is NonNullable<typeof a> => a !== null,
        );

        // Get deliverable count for this task
        const documents = await ctx.db
          .query("documents")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();
        const documentCount = documents.filter(
          (d) => d.type === "deliverable",
        ).length;

        return {
          ...task,
          assignees: validAssignees.map((a) => ({
            _id: a._id,
            name: a.name,
            emoji: a.emoji,
          })),
          documentCount,
        };
      }),
    );
  },
});

// Get tasks for a specific agent
export const getForAgent = query({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!agent) {
      return [];
    }

    // Get all non-done tasks and filter by assignee
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    return allTasks.filter(
      (task) => task.status !== "done" && task.assigneeIds?.includes(agent._id),
    );
  },
});

// Get task by ID with full details
export const get = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return null;

    // Get assignees
    const assignees = task.assigneeIds
      ? await Promise.all(task.assigneeIds.map((id) => ctx.db.get(id)))
      : [];

    // Get creator
    let creator = null;
    if (task.createdBy) {
      creator = await ctx.db.get(task.createdBy);
    }

    // Get messages (comments)
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const messagesWithAuthors = await Promise.all(
      messages.map(async (m) => {
        let author = null;
        if (m.fromAgentId) {
          const agent = await ctx.db.get(m.fromAgentId);
          author = agent ? { name: agent.name, emoji: agent.emoji } : null;
        } else if (m.humanAuthor) {
          author = { name: m.humanAuthor, emoji: "👤", isHuman: true };
        }
        return { ...m, author };
      }),
    );

    // Get deliverables
    const deliverables = await ctx.db
      .query("documents")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    // Enrich subtasks with assignee info
    let enrichedSubtasks;
    if (task.subtasks) {
      enrichedSubtasks = await Promise.all(
        task.subtasks.map(async (st) => {
          if (st.assigneeId) {
            const assignee = await ctx.db.get(st.assigneeId);
            return {
              ...st,
              assignee: assignee
                ? {
                    _id: assignee._id,
                    name: assignee.name,
                    emoji: assignee.emoji,
                  }
                : null,
            };
          }
          return { ...st, assignee: null };
        }),
      );
    }

    const validAssignees = assignees.filter(
      (a): a is NonNullable<typeof a> => a !== null,
    );

    return {
      ...task,
      assignees: validAssignees.map((a) => ({
        _id: a._id,
        name: a.name,
        emoji: a.emoji,
      })),
      creator: creator
        ? { _id: creator._id, name: creator.name, emoji: creator.emoji }
        : null,
      messages: messagesWithAuthors,
      deliverables,
      subtasks: enrichedSubtasks || task.subtasks,
    };
  },
});

// Create a new task
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("normal"),
        v.literal("high"),
        v.literal("urgent"),
      ),
    ),
    assigneeSessionKey: v.optional(v.string()),
    createdBySessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find assignee if provided
    let assigneeIds: Id<"agents">[] = [];
    if (args.assigneeSessionKey) {
      const sessionKey = args.assigneeSessionKey;
      const assignee = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sessionKey))
        .first();
      if (assignee) {
        assigneeIds = [assignee._id];
      }
    }

    // Find creator if provided
    let createdBy = undefined;
    let creatorAgent = null;
    if (args.createdBySessionKey) {
      const sessionKey = args.createdBySessionKey;
      creatorAgent = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sessionKey))
        .first();
      if (creatorAgent) {
        createdBy = creatorAgent._id;
      }
    }

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: assigneeIds.length > 0 ? "assigned" : "inbox",
      priority: args.priority ?? "normal",
      assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      createdBy,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "task_created",
      agentId: createdBy,
      taskId,
      message: `Task created: ${args.title}`,
      createdAt: now,
    });

    // Send notification to assignee
    const firstAssigneeId = assigneeIds[0];
    if (firstAssigneeId) {
      const assignee = await ctx.db.get(firstAssigneeId);
      if (assignee) {
        await ctx.db.insert("notifications", {
          targetAgentId: assignee._id,
          sourceAgentId: createdBy,
          type: "task_assigned",
          taskId,
          content: `New task assigned: ${args.title}`,
          delivered: false,
          createdAt: now,
        });
      }
    }

    return taskId;
  },
});

// Update task status
export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
    ),
    bySessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const oldStatus = task.status;

    // Find the agent making the change
    let agentId = undefined;
    let agentName = "System";
    if (args.bySessionKey) {
      const sessionKey = args.bySessionKey;
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sessionKey))
        .first();
      if (agent) {
        agentId = agent._id;
        agentName = agent.name;
      }
    }

    // Update task
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };
    if (args.status === "done") {
      updates.completedAt = now;
    }

    await ctx.db.patch(args.taskId, updates);

    // Log activity
    await ctx.db.insert("activities", {
      type: "task_status_changed",
      agentId,
      taskId: args.taskId,
      message: `${agentName}: Task "${task.title}" status: ${oldStatus} → ${args.status}`,
      metadata: { oldStatus, newStatus: args.status },
      createdAt: now,
    });

    // Send notifications for review
    if (args.status === "review" && task.createdBy) {
      await ctx.db.insert("notifications", {
        targetAgentId: task.createdBy,
        sourceAgentId: agentId,
        type: "review_requested",
        taskId: args.taskId,
        content: `🔍 Review requested: "${task.title}"`,
        delivered: false,
        createdAt: now,
      });
    }
  },
});

// Assign task to agent(s)
export const assign = mutation({
  args: {
    taskId: v.id("tasks"),
    assigneeSessionKeys: v.array(v.string()),
    bySessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Find assignees
    const assigneeIds: Id<"agents">[] = [];
    for (const sessionKey of args.assigneeSessionKeys) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sessionKey))
        .first();
      if (agent) {
        assigneeIds.push(agent._id);
      }
    }

    // Find assigner
    let assignerId = undefined;
    if (args.bySessionKey) {
      const sessionKey = args.bySessionKey;
      const assigner = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sessionKey))
        .first();
      if (assigner) {
        assignerId = assigner._id;
      }
    }

    // Update task
    await ctx.db.patch(args.taskId, {
      assigneeIds,
      status: task.status === "inbox" ? "assigned" : task.status,
      updatedAt: now,
    });

    // Send notifications to assignees
    for (const assigneeId of assigneeIds) {
      await ctx.db.insert("notifications", {
        targetAgentId: assigneeId,
        sourceAgentId: assignerId,
        type: "task_assigned",
        taskId: args.taskId,
        content: `Task assigned: ${task.title}`,
        delivered: false,
        createdAt: now,
      });
    }

    // Log activity
    await ctx.db.insert("activities", {
      type: "task_assigned",
      agentId: assignerId,
      taskId: args.taskId,
      message: `Task "${task.title}" assigned to ${assigneeIds.length} agent(s)`,
      createdAt: now,
    });
  },
});

// Add a comment to a task
export const addComment = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
    bySessionKey: v.optional(v.string()),
    humanAuthor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    let fromAgentId = undefined;
    let authorName = args.humanAuthor ?? "Unknown";

    if (args.bySessionKey) {
      const sessionKey = args.bySessionKey;
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sessionKey))
        .first();
      if (agent) {
        fromAgentId = agent._id;
        authorName = agent.name;
      }
    }

    const messageId = await ctx.db.insert("messages", {
      taskId: args.taskId,
      fromAgentId,
      humanAuthor: args.humanAuthor,
      type: "comment",
      content: args.content,
      createdAt: now,
    });

    // Update task timestamp
    await ctx.db.patch(args.taskId, { updatedAt: now });

    // Log activity
    await ctx.db.insert("activities", {
      type: "message_sent",
      agentId: fromAgentId,
      taskId: args.taskId,
      message: `${authorName} commented on task`,
      createdAt: now,
    });

    return messageId;
  },
});

// Add a subtask
export const addSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.string(),
    description: v.optional(v.string()),
    assigneeSessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Find assignee if provided
    let assigneeId = undefined;
    if (args.assigneeSessionKey) {
      const sessionKey = args.assigneeSessionKey;
      const assignee = await ctx.db
        .query("agents")
        .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sessionKey))
        .first();
      if (assignee) {
        assigneeId = assignee._id;
      }
    }

    const newSubtask = {
      title: args.title,
      description: args.description,
      done: false,
      assigneeId,
    };

    const subtasks = task.subtasks || [];
    subtasks.push(newSubtask);

    await ctx.db.patch(args.taskId, {
      subtasks,
      updatedAt: Date.now(),
    });

    return subtasks.length - 1; // Return index of new subtask
  },
});

// Mark subtask as done/undone
export const updateSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    subtaskIndex: v.number(),
    done: v.boolean(),
    bySessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    if (!task.subtasks || !task.subtasks[args.subtaskIndex]) {
      throw new Error("Subtask not found");
    }

    const subtasks = [...task.subtasks];
    const currentSubtask = subtasks[args.subtaskIndex];
    // We already checked this exists above, but TypeScript needs reassurance
    if (!currentSubtask) {
      throw new Error("Subtask not found");
    }

    const updatedSubtask = {
      title: currentSubtask.title,
      description: currentSubtask.description,
      assigneeId: currentSubtask.assigneeId,
      done: args.done,
      doneAt: args.done ? now : undefined,
    };
    subtasks[args.subtaskIndex] = updatedSubtask;

    await ctx.db.patch(args.taskId, {
      subtasks,
      updatedAt: now,
    });

    // Log activity if completing
    if (args.done) {
      let agentId = undefined;
      let agentName = "System";
      if (args.bySessionKey) {
        const sessionKey = args.bySessionKey;
        const agent = await ctx.db
          .query("agents")
          .withIndex("by_sessionKey", (q) => q.eq("sessionKey", sessionKey))
          .first();
        if (agent) {
          agentId = agent._id;
          agentName = agent.name;
        }
      }

      await ctx.db.insert("activities", {
        type: "subtask_completed",
        agentId,
        taskId: args.taskId,
        message: `${agentName} completed "${updatedSubtask.title}" on "${task.title}"`,
        createdAt: now,
      });
    }
  },
});

// Update task details
export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("normal"),
        v.literal("high"),
        v.literal("urgent"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { taskId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    await ctx.db.patch(taskId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a task
export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    // Also delete related messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete related documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const doc of documents) {
      await ctx.db.delete(doc._id);
    }

    await ctx.db.delete(args.taskId);
  },
});
