import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agents - AI agent profiles with coordination support
  agents: defineTable({
    name: v.string(),
    role: v.string(), // "Squad Lead", "Content Writer", etc.
    emoji: v.optional(v.string()), // "🦞", "✍️", etc.
    sessionKey: v.string(), // "agent:main:main" - OpenClaw session key
    status: v.union(
      v.literal("idle"),
      v.literal("active"),
      v.literal("blocked"),
    ),
    currentTaskId: v.optional(v.id("tasks")),
    config: v.optional(v.any()), // Agent-specific configuration
    // Presence tracking
    presenceStatus: v.optional(
      v.union(v.literal("online"), v.literal("idle"), v.literal("offline")),
    ),
    lastHeartbeat: v.optional(v.number()),
    lastSeen: v.optional(v.number()),
    currentActivity: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionKey", ["sessionKey"])
    .index("by_status", ["status"])
    .index("by_presence", ["presenceStatus"])
    .index("by_lastSeen", ["lastSeen"]),

  // Tasks - Mission queue with full workflow support
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("inbox"), // New task, not yet assigned
      v.literal("assigned"), // Assigned but not started
      v.literal("in_progress"), // Being worked on
      v.literal("review"), // Submitted for review
      v.literal("done"), // Completed and approved
    ),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("normal"),
        v.literal("high"),
        v.literal("urgent"),
      ),
    ),
    // Subtasks - embedded array for checklist-style tracking
    subtasks: v.optional(
      v.array(
        v.object({
          title: v.string(),
          description: v.optional(v.string()),
          done: v.boolean(),
          doneAt: v.optional(v.number()),
          assigneeId: v.optional(v.id("agents")),
        }),
      ),
    ),
    // Multiple assignees supported
    assigneeIds: v.optional(v.array(v.id("agents"))),
    createdBy: v.optional(v.id("agents")),
    deadline: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  // Messages - Task comments and agent communication
  messages: defineTable({
    taskId: v.optional(v.id("tasks")),
    fromAgentId: v.optional(v.id("agents")), // Optional for human users
    humanAuthor: v.optional(v.string()), // For human commenters
    type: v.union(
      v.literal("comment"), // Task comment
      v.literal("status_change"), // Status update
      v.literal("system"), // System message
    ),
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_agent", ["fromAgentId"])
    .index("by_created", ["createdAt"]),

  // Notifications - Agent-to-agent coordination
  notifications: defineTable({
    targetAgentId: v.id("agents"), // Who receives this
    sourceAgentId: v.optional(v.id("agents")), // Who triggered it (optional for system)
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
    content: v.string(), // Human-readable notification text
    delivered: v.boolean(), // Has the agent seen this?
    deliveredAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_target_undelivered", ["targetAgentId", "delivered"])
    .index("by_target", ["targetAgentId"])
    .index("by_createdAt", ["createdAt"]),

  // Activities - Audit log / activity feed
  activities: defineTable({
    type: v.union(
      v.literal("task_created"),
      v.literal("task_assigned"),
      v.literal("task_status_changed"),
      v.literal("subtask_completed"),
      v.literal("message_sent"),
      v.literal("document_created"),
      v.literal("agent_heartbeat"),
      v.literal("notification_sent"),
    ),
    agentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    message: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_agent", ["agentId"])
    .index("by_task", ["taskId"])
    .index("by_createdAt", ["createdAt"]),

  // Documents - Deliverables and file references
  documents: defineTable({
    title: v.string(),
    content: v.optional(v.string()), // Markdown content (for text docs)
    path: v.optional(v.string()), // File path (for file deliverables)
    fileId: v.optional(v.id("_storage")), // Convex storage ID for uploaded files
    type: v.union(
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("reference"),
      v.literal("note"),
    ),
    taskId: v.optional(v.id("tasks")),
    createdBy: v.id("agents"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_type", ["type"])
    .index("by_agent", ["createdBy"]),

  // Settings - Key-value store for app configuration
  settings: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // Business Context - Website/business info for agent context
  businessContext: defineTable({
    url: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    favicon: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        title: v.optional(v.string()),
        ogImage: v.optional(v.string()),
        industry: v.optional(v.string()),
        keywords: v.optional(v.array(v.string())),
        targetAudience: v.optional(v.string()),
        tone: v.optional(v.string()),
      }),
    ),
    approved: v.boolean(),
    approvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Channels - Connected messaging channels (Telegram, etc.)
  channels: defineTable({
    type: v.string(),
    status: v.union(v.literal("connected"), v.literal("disconnected")),
    accountId: v.optional(v.string()),
    connectedAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  }).index("by_type", ["type"]),
});
