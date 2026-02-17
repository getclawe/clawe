import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { resolveTenantId } from "./lib/auth";
import { getAgentBySessionKey } from "./lib/helpers";

// List all tasks with optional filters
export const list = query({
  args: {
    machineToken: v.optional(v.string()),
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
    const tenantId = await resolveTenantId(ctx, args);

    let tasksQuery;
    const status = args.status;
    if (status) {
      tasksQuery = ctx.db
        .query("tasks")
        .withIndex("by_tenant_status", (q) =>
          q.eq("tenantId", tenantId).eq("status", status),
        )
        .order("desc");
    } else {
      tasksQuery = ctx.db
        .query("tasks")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .order("desc");
    }

    const tasks = args.limit
      ? await tasksQuery.take(args.limit)
      : await tasksQuery.collect();

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
          .withIndex("by_tenant_task", (q) =>
            q.eq("tenantId", tenantId).eq("taskId", task._id),
          )
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
  args: {
    machineToken: v.optional(v.string()),
    sessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);

    const agent = await getAgentBySessionKey(ctx, tenantId, args.sessionKey);

    if (!agent) {
      return [];
    }

    // Get all tasks for this tenant and filter by assignee
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .collect();

    return allTasks.filter(
      (task) => task.status !== "done" && task.assigneeIds?.includes(agent._id),
    );
  },
});

// Get task by ID with full details
export const get = query({
  args: {
    machineToken: v.optional(v.string()),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.tenantId !== tenantId) return null;

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
      .withIndex("by_tenant_task", (q) =>
        q.eq("tenantId", tenantId).eq("taskId", args.taskId),
      )
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
      .withIndex("by_tenant_task", (q) =>
        q.eq("tenantId", tenantId).eq("taskId", args.taskId),
      )
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
    machineToken: v.optional(v.string()),
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
    const tenantId = await resolveTenantId(ctx, args);
    const now = Date.now();

    // Find assignee if provided
    let assigneeIds: Id<"agents">[] = [];
    if (args.assigneeSessionKey) {
      const assignee = await getAgentBySessionKey(
        ctx,
        tenantId,
        args.assigneeSessionKey,
      );
      if (assignee) {
        assigneeIds = [assignee._id];
      }
    }

    // Find creator if provided
    let createdBy = undefined;
    let creatorAgent = null;
    if (args.createdBySessionKey) {
      creatorAgent = await getAgentBySessionKey(
        ctx,
        tenantId,
        args.createdBySessionKey,
      );
      if (creatorAgent) {
        createdBy = creatorAgent._id;
      }
    }

    const taskId = await ctx.db.insert("tasks", {
      tenantId,
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
      tenantId,
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
          tenantId,
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
    machineToken: v.optional(v.string()),
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
    const tenantId = await resolveTenantId(ctx, args);
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task || task.tenantId !== tenantId) throw new Error("Task not found");

    const oldStatus = task.status;

    // Find the agent making the change
    let agentId = undefined;
    let agentName = "System";
    if (args.bySessionKey) {
      const agent = await getAgentBySessionKey(
        ctx,
        tenantId,
        args.bySessionKey,
      );
      if (agent) {
        agentId = agent._id;
        agentName = agent.name;
      }
    }

    // Gate: can't move to "review" or "done" if subtasks are still pending/in_progress
    if (
      (args.status === "review" || args.status === "done") &&
      task.subtasks &&
      task.subtasks.length > 0
    ) {
      const unfinished = task.subtasks.filter((st) => {
        const status = st.status ?? (st.done ? "done" : "pending");
        return status !== "done" && status !== "blocked";
      });
      if (unfinished.length > 0) {
        throw new Error(
          `Cannot move to ${args.status}: ${unfinished.length} subtask(s) still pending or in progress`,
        );
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
      tenantId,
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
        tenantId,
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

// Approve a task in review → done
export const approve = mutation({
  args: {
    machineToken: v.optional(v.string()),
    taskId: v.id("tasks"),
    humanAuthor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task || task.tenantId !== tenantId) throw new Error("Task not found");
    if (task.status !== "review") throw new Error("Task is not in review");

    const authorName = args.humanAuthor ?? "Owner";

    // Set to done
    await ctx.db.patch(args.taskId, {
      status: "done",
      completedAt: now,
      updatedAt: now,
    });

    // Add comment
    await ctx.db.insert("messages", {
      tenantId,
      taskId: args.taskId,
      humanAuthor: authorName,
      type: "comment",
      content: "✅ Approved — looks good!",
      createdAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      tenantId,
      type: "task_status_changed",
      taskId: args.taskId,
      message: `${authorName} approved "${task.title}"`,
      metadata: { oldStatus: "review", newStatus: "done" },
      createdAt: now,
    });

    // Notify assignees
    if (task.assigneeIds) {
      for (const assigneeId of task.assigneeIds) {
        await ctx.db.insert("notifications", {
          tenantId,
          targetAgentId: assigneeId,
          type: "task_completed",
          taskId: args.taskId,
          content: `✅ "${task.title}" approved!`,
          delivered: false,
          createdAt: now,
        });
      }
    }
  },
});

// Request changes on a task in review → back to in_progress
export const requestChanges = mutation({
  args: {
    machineToken: v.optional(v.string()),
    taskId: v.id("tasks"),
    feedback: v.string(),
    humanAuthor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task || task.tenantId !== tenantId) throw new Error("Task not found");
    if (task.status !== "review") throw new Error("Task is not in review");

    const authorName = args.humanAuthor ?? "Owner";

    // Set back to in_progress
    await ctx.db.patch(args.taskId, {
      status: "in_progress",
      updatedAt: now,
    });

    // Add feedback as comment
    await ctx.db.insert("messages", {
      tenantId,
      taskId: args.taskId,
      humanAuthor: authorName,
      type: "comment",
      content: `✏️ Changes requested:\n${args.feedback}`,
      createdAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      tenantId,
      type: "task_status_changed",
      taskId: args.taskId,
      message: `${authorName} requested changes on "${task.title}"`,
      metadata: { oldStatus: "review", newStatus: "in_progress" },
      createdAt: now,
    });

    // Notify assignees
    if (task.assigneeIds) {
      for (const assigneeId of task.assigneeIds) {
        await ctx.db.insert("notifications", {
          tenantId,
          targetAgentId: assigneeId,
          type: "task_assigned",
          taskId: args.taskId,
          content: `✏️ Changes requested on "${task.title}":\n${args.feedback}`,
          delivered: false,
          createdAt: now,
        });
      }
    }
  },
});

// Assign task to agent(s)
export const assign = mutation({
  args: {
    machineToken: v.optional(v.string()),
    taskId: v.id("tasks"),
    assigneeSessionKeys: v.array(v.string()),
    bySessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task || task.tenantId !== tenantId) throw new Error("Task not found");

    // Find assignees
    const assigneeIds: Id<"agents">[] = [];
    for (const sessionKey of args.assigneeSessionKeys) {
      const agent = await getAgentBySessionKey(ctx, tenantId, sessionKey);
      if (agent) {
        assigneeIds.push(agent._id);
      }
    }

    // Find assigner
    let assignerId = undefined;
    if (args.bySessionKey) {
      const assigner = await getAgentBySessionKey(
        ctx,
        tenantId,
        args.bySessionKey,
      );
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
        tenantId,
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
      tenantId,
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
    machineToken: v.optional(v.string()),
    taskId: v.id("tasks"),
    content: v.string(),
    bySessionKey: v.optional(v.string()),
    humanAuthor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const now = Date.now();

    let fromAgentId = undefined;
    let authorName = args.humanAuthor ?? "Unknown";

    if (args.bySessionKey) {
      const agent = await getAgentBySessionKey(
        ctx,
        tenantId,
        args.bySessionKey,
      );
      if (agent) {
        fromAgentId = agent._id;
        authorName = agent.name;
      }
    }

    // Verify task belongs to tenant
    const task = await ctx.db.get(args.taskId);
    if (!task || task.tenantId !== tenantId) throw new Error("Task not found");

    const messageId = await ctx.db.insert("messages", {
      tenantId,
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
      tenantId,
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
    machineToken: v.optional(v.string()),
    taskId: v.id("tasks"),
    title: v.string(),
    description: v.optional(v.string()),
    assigneeSessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.tenantId !== tenantId) throw new Error("Task not found");

    // Find assignee if provided
    let assigneeId = undefined;
    if (args.assigneeSessionKey) {
      const assignee = await getAgentBySessionKey(
        ctx,
        tenantId,
        args.assigneeSessionKey,
      );
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

// Update subtask status
export const updateSubtask = mutation({
  args: {
    machineToken: v.optional(v.string()),
    taskId: v.id("tasks"),
    subtaskIndex: v.number(),
    done: v.optional(v.boolean()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("done"),
        v.literal("blocked"),
      ),
    ),
    blockedReason: v.optional(v.string()),
    bySessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task || task.tenantId !== tenantId) throw new Error("Task not found");
    if (!task.subtasks || !task.subtasks[args.subtaskIndex]) {
      throw new Error("Subtask not found");
    }

    const subtasks = [...task.subtasks];
    const currentSubtask = subtasks[args.subtaskIndex];
    if (!currentSubtask) {
      throw new Error("Subtask not found");
    }

    // Determine new status — support both legacy `done` flag and new `status` field
    let newStatus = args.status;
    if (!newStatus && args.done !== undefined) {
      newStatus = args.done ? "done" : "pending";
    }
    const isDone = newStatus === "done";

    const updatedSubtask = {
      title: currentSubtask.title,
      description: currentSubtask.description,
      assigneeId: currentSubtask.assigneeId,
      done: isDone,
      doneAt: isDone ? now : undefined,
      status: newStatus ?? currentSubtask.status ?? "pending",
      blockedReason: newStatus === "blocked" ? args.blockedReason : undefined,
    };
    subtasks[args.subtaskIndex] = updatedSubtask;

    await ctx.db.patch(args.taskId, {
      subtasks,
      updatedAt: now,
    });

    // Find agent
    let agentId = undefined;
    let agentName = "System";
    if (args.bySessionKey) {
      const agent = await getAgentBySessionKey(
        ctx,
        tenantId,
        args.bySessionKey,
      );
      if (agent) {
        agentId = agent._id;
        agentName = agent.name;
      }
    }

    // Log activity
    if (isDone) {
      await ctx.db.insert("activities", {
        tenantId,
        type: "subtask_completed",
        agentId,
        taskId: args.taskId,
        message: `${agentName} completed "${updatedSubtask.title}" on "${task.title}"`,
        createdAt: now,
      });
    } else if (newStatus === "blocked") {
      await ctx.db.insert("activities", {
        tenantId,
        type: "subtask_blocked",
        agentId,
        taskId: args.taskId,
        message: `${agentName} blocked "${updatedSubtask.title}" on "${task.title}"${args.blockedReason ? `: ${args.blockedReason}` : ""}`,
        createdAt: now,
      });

      // Notify task creator about the blocked subtask
      if (task.createdBy) {
        await ctx.db.insert("notifications", {
          tenantId,
          targetAgentId: task.createdBy,
          sourceAgentId: agentId,
          type: "review_requested",
          taskId: args.taskId,
          content: `⚠️ Subtask blocked: "${updatedSubtask.title}" on "${task.title}"${args.blockedReason ? ` — ${args.blockedReason}` : ""}`,
          delivered: false,
          createdAt: now,
        });
      }
    }
  },
});

// Update task details
export const update = mutation({
  args: {
    machineToken: v.optional(v.string()),
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
    const tenantId = await resolveTenantId(ctx, args);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.tenantId !== tenantId) throw new Error("Task not found");

    const { machineToken: _, taskId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    await ctx.db.patch(taskId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Create a task from the dashboard (attributed to Clawe)
export const createFromDashboard = mutation({
  args: {
    machineToken: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const now = Date.now();

    // Find Clawe (main leader) to attribute the task creation
    const clawe = await getAgentBySessionKey(ctx, tenantId, "agent:main:main");

    const taskId = await ctx.db.insert("tasks", {
      tenantId,
      title: args.title,
      description: args.description,
      status: "inbox",
      priority: args.priority ?? "normal",
      createdBy: clawe?._id,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      tenantId,
      type: "task_created",
      agentId: clawe?._id,
      taskId,
      message: `Task created: ${args.title}`,
      createdAt: now,
    });

    return taskId;
  },
});

// Create a full task with description, subtasks, and assignments in one atomic operation
export const createWithPlan = mutation({
  args: {
    machineToken: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
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
    subtasks: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        assigneeSessionKey: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const now = Date.now();

    // Resolve creator
    let createdBy = undefined;
    let creatorName = "System";
    if (args.createdBySessionKey) {
      const creator = await getAgentBySessionKey(
        ctx,
        tenantId,
        args.createdBySessionKey,
      );
      if (creator) {
        createdBy = creator._id;
        creatorName = creator.name;
      }
    }

    // Resolve primary assignee
    const assigneeIds: Id<"agents">[] = [];
    if (args.assigneeSessionKey) {
      const assignee = await getAgentBySessionKey(
        ctx,
        tenantId,
        args.assigneeSessionKey,
      );
      if (assignee) {
        assigneeIds.push(assignee._id);
      }
    }

    // Resolve subtask assignees and build subtasks array
    const subtasks = [];
    for (const st of args.subtasks) {
      let assigneeId = undefined;
      if (st.assigneeSessionKey) {
        const assignee = await getAgentBySessionKey(
          ctx,
          tenantId,
          st.assigneeSessionKey,
        );
        if (assignee) {
          assigneeId = assignee._id;
          // Also add subtask assignees to task-level assignees if not already there
          if (!assigneeIds.includes(assignee._id)) {
            assigneeIds.push(assignee._id);
          }
        }
      }

      subtasks.push({
        title: st.title,
        description: st.description,
        done: false,
        assigneeId,
      });
    }

    // Create the task
    const taskId = await ctx.db.insert("tasks", {
      tenantId,
      title: args.title,
      description: args.description,
      status: assigneeIds.length > 0 ? "assigned" : "inbox",
      priority: args.priority ?? "normal",
      assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      createdBy,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      tenantId,
      type: "task_created",
      agentId: createdBy,
      taskId,
      message: `${creatorName} planned task: ${args.title} (${subtasks.length} subtasks)`,
      createdAt: now,
    });

    // Send notifications to all assigned agents
    for (const assigneeId of assigneeIds) {
      const assignee = await ctx.db.get(assigneeId);
      if (assignee) {
        // Build notification content with subtask details
        const agentSubtasks = subtasks
          .filter((st) => st.assigneeId === assigneeId)
          .map((st) => `  • ${st.title}`)
          .join("\n");

        const content = agentSubtasks
          ? `📋 New task: "${args.title}"\n\nYour subtasks:\n${agentSubtasks}`
          : `📋 New task assigned: "${args.title}"`;

        await ctx.db.insert("notifications", {
          tenantId,
          targetAgentId: assigneeId,
          sourceAgentId: createdBy,
          type: "task_assigned",
          taskId,
          content,
          delivered: false,
          createdAt: now,
        });
      }
    }

    return taskId;
  },
});

// Delete a task
export const remove = mutation({
  args: {
    machineToken: v.optional(v.string()),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const tenantId = await resolveTenantId(ctx, args);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.tenantId !== tenantId) throw new Error("Task not found");

    // Also delete related messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_tenant_task", (q) =>
        q.eq("tenantId", tenantId).eq("taskId", args.taskId),
      )
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete related documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_tenant_task", (q) =>
        q.eq("tenantId", tenantId).eq("taskId", args.taskId),
      )
      .collect();

    for (const doc of documents) {
      await ctx.db.delete(doc._id);
    }

    await ctx.db.delete(args.taskId);
  },
});
