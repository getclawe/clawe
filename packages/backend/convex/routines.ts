import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Schedule validator (reusable)
const scheduleValidator = v.object({
  type: v.literal("weekly"),
  daysOfWeek: v.array(v.number()),
  hour: v.number(),
  minute: v.number(),
});

// Priority validator (reusable)
const priorityValidator = v.optional(
  v.union(
    v.literal("low"),
    v.literal("normal"),
    v.literal("high"),
    v.literal("urgent"),
  ),
);

// List all routines (or only enabled ones)
export const list = query({
  args: { enabledOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.enabledOnly) {
      return await ctx.db
        .query("routines")
        .withIndex("by_enabled", (q) => q.eq("enabled", true))
        .collect();
    }
    return await ctx.db.query("routines").collect();
  },
});

// Get a single routine by ID
export const get = query({
  args: { routineId: v.id("routines") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.routineId);
  },
});

// Create a new routine
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: priorityValidator,
    schedule: scheduleValidator,
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("routines", {
      title: args.title,
      description: args.description,
      priority: args.priority,
      schedule: args.schedule,
      color: args.color,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update routine details
export const update = mutation({
  args: {
    routineId: v.id("routines"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: priorityValidator,
    schedule: v.optional(scheduleValidator),
    color: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { routineId, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    await ctx.db.patch(routineId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a routine
export const remove = mutation({
  args: { routineId: v.id("routines") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.routineId);
  },
});

// Trigger a routine - create a task from the routine template
export const trigger = mutation({
  args: { routineId: v.id("routines") },
  handler: async (ctx, args) => {
    const routine = await ctx.db.get(args.routineId);
    if (!routine) {
      throw new Error("Routine not found");
    }

    // Find Clawe (main leader) to attribute the task creation
    const clawe = await ctx.db
      .query("agents")
      .withIndex("by_sessionKey", (q) => q.eq("sessionKey", "agent:main:main"))
      .first();

    const now = Date.now();

    // Create task from routine template
    const taskId = await ctx.db.insert("tasks", {
      title: routine.title,
      description: routine.description,
      priority: routine.priority ?? "normal",
      status: "inbox",
      createdBy: clawe?._id,
      createdAt: now,
      updatedAt: now,
    });

    // Update lastTriggeredAt
    await ctx.db.patch(args.routineId, {
      lastTriggeredAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "task_created",
      agentId: clawe?._id,
      taskId,
      message: `Routine "${routine.title}" triggered`,
      metadata: { routineId: args.routineId },
      createdAt: now,
    });

    return taskId;
  },
});

/**
 * Get routines that are due to trigger.
 *
 * Uses a 1-hour window: if a routine is scheduled for 6:00 AM,
 * it can trigger anytime between 6:00 AM and 6:59 AM.
 * This provides tolerance for backend crashes and restarts.
 *
 * Deduplication: once triggered, `lastTriggeredAt` is set to the current time.
 * The routine won't trigger again until the next scheduled cycle.
 */
export const getDueRoutines = query({
  args: {
    currentTimestamp: v.number(), // Current UTC timestamp from watcher
    dayOfWeek: v.number(), // Current day in user's timezone (0-6)
    hour: v.number(), // Current hour in user's timezone (0-23)
    minute: v.number(), // Current minute in user's timezone (0-59)
  },
  handler: async (ctx, args) => {
    const { currentTimestamp, dayOfWeek, hour, minute } = args;

    // Get all enabled routines
    const routines = await ctx.db
      .query("routines")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();

    // Current time as minutes since midnight (in user's timezone)
    const currentMinuteOfDay = hour * 60 + minute;

    const dueRoutines: Array<{
      _id: (typeof routines)[0]["_id"];
      title: string;
      cycleStart: number;
    }> = [];

    for (const routine of routines) {
      // Check if today is a scheduled day
      if (!routine.schedule.daysOfWeek.includes(dayOfWeek)) {
        continue;
      }

      // Calculate scheduled time as minutes since midnight
      const scheduledMinuteOfDay =
        routine.schedule.hour * 60 + routine.schedule.minute;

      // Calculate how many minutes since the scheduled time
      const minutesSinceScheduled = currentMinuteOfDay - scheduledMinuteOfDay;

      // Check if we're within the 1-hour window (0-59 minutes after scheduled time)
      if (minutesSinceScheduled < 0 || minutesSinceScheduled >= 60) {
        continue; // Not in window
      }

      // Calculate the cycle start timestamp (when this occurrence was scheduled)
      const cycleStart = currentTimestamp - minutesSinceScheduled * 60 * 1000;

      // Check if already triggered this cycle
      if (routine.lastTriggeredAt && routine.lastTriggeredAt >= cycleStart) {
        continue; // Already triggered
      }

      dueRoutines.push({
        _id: routine._id,
        title: routine.title,
        cycleStart,
      });
    }

    return dueRoutines;
  },
});
