import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users - Human users (created from Cognito JWT on first login)
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  // Accounts - Billing/organizational unit (one auto-created per user on signup)
  accounts: defineTable({
    name: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Account Members - join table linking users to accounts
  accountMembers: defineTable({
    userId: v.id("users"),
    accountId: v.id("accounts"),
    role: v.union(v.literal("owner"), v.literal("member")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_account", ["accountId"])
    .index("by_user_account", ["userId", "accountId"]),

  // Tenants - One per account, owns a squadhub instance
  tenants: defineTable({
    accountId: v.id("accounts"),
    status: v.union(
      v.literal("provisioning"),
      v.literal("active"),
      v.literal("stopped"),
      v.literal("error"),
    ),
    squadhubUrl: v.optional(v.string()),
    squadhubToken: v.optional(v.string()),
    squadhubServiceArn: v.optional(v.string()),
    efsAccessPointId: v.optional(v.string()),
    anthropicApiKey: v.optional(v.string()),
    openaiApiKey: v.optional(v.string()),
    settings: v.optional(
      v.object({
        timezone: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_account", ["accountId"])
    .index("by_status", ["status"])
    .index("by_squadhubToken", ["squadhubToken"]),

  // Agents - AI agent profiles with coordination support
  agents: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    role: v.string(), // "Squad Lead", "Content Writer", etc.
    emoji: v.optional(v.string()), // "🦞", "✍️", etc.
    sessionKey: v.string(), // "agent:main:main" - squadhub session key
    status: v.union(v.literal("online"), v.literal("offline")),
    currentTaskId: v.optional(v.id("tasks")),
    config: v.optional(v.any()), // Agent-specific configuration
    lastHeartbeat: v.optional(v.number()),
    lastSeen: v.optional(v.number()),
    currentActivity: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_sessionKey", ["sessionKey"])
    .index("by_status", ["status"])
    .index("by_lastSeen", ["lastSeen"])
    .index("by_tenant_sessionKey", ["tenantId", "sessionKey"])
    .index("by_tenant_status", ["tenantId", "status"]),

  // Tasks - Mission queue with full workflow support
  tasks: defineTable({
    tenantId: v.id("tenants"),
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
          status: v.optional(
            v.union(
              v.literal("pending"),
              v.literal("in_progress"),
              v.literal("done"),
              v.literal("blocked"),
            ),
          ),
          blockedReason: v.optional(v.string()),
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
    .index("by_tenant", ["tenantId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"])
    .index("by_tenant_status", ["tenantId", "status"]),

  // Messages - Task comments and agent communication
  messages: defineTable({
    tenantId: v.id("tenants"),
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
    .index("by_tenant", ["tenantId"])
    .index("by_task", ["taskId"])
    .index("by_agent", ["fromAgentId"])
    .index("by_created", ["createdAt"])
    .index("by_tenant_agent", ["tenantId", "fromAgentId"])
    .index("by_tenant_task", ["tenantId", "taskId"]),

  // Notifications - Agent-to-agent coordination
  notifications: defineTable({
    tenantId: v.id("tenants"),
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
    .index("by_tenant", ["tenantId"])
    .index("by_target_undelivered", ["targetAgentId", "delivered"])
    .index("by_target", ["targetAgentId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_tenant_target", ["tenantId", "targetAgentId"])
    .index("by_tenant_target_undelivered", [
      "tenantId",
      "targetAgentId",
      "delivered",
    ]),

  // Activities - Audit log / activity feed
  activities: defineTable({
    tenantId: v.id("tenants"),
    type: v.union(
      v.literal("task_created"),
      v.literal("task_assigned"),
      v.literal("task_status_changed"),
      v.literal("subtask_completed"),
      v.literal("message_sent"),
      v.literal("document_created"),
      v.literal("agent_heartbeat"),
      v.literal("notification_sent"),
      v.literal("subtask_blocked"),
    ),
    agentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    message: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_type", ["type"])
    .index("by_agent", ["agentId"])
    .index("by_task", ["taskId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_tenant_task", ["tenantId", "taskId"])
    .index("by_tenant_type", ["tenantId", "type"]),

  // Documents - Deliverables and file references
  documents: defineTable({
    tenantId: v.id("tenants"),
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
    .index("by_tenant", ["tenantId"])
    .index("by_task", ["taskId"])
    .index("by_type", ["type"])
    .index("by_agent", ["createdBy"])
    .index("by_tenant_type", ["tenantId", "type"])
    .index("by_tenant_task", ["tenantId", "taskId"]),

  // Business Context - Website/business info for agent context
  businessContext: defineTable({
    tenantId: v.id("tenants"),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_tenant", ["tenantId"]),

  // Channels - Connected messaging channels (Telegram, etc.)
  channels: defineTable({
    tenantId: v.id("tenants"),
    type: v.string(),
    status: v.union(v.literal("connected"), v.literal("disconnected")),
    connectedAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  })
    .index("by_tenant_type", ["tenantId", "type"])
    .index("by_type", ["type"]),

  // Routines - Recurring task templates with schedules
  routines: defineTable({
    tenantId: v.id("tenants"),
    // Template info (used to create tasks)
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

    // Schedule (weekly only for now)
    // Note: Timezone is global (from settings), not per-routine
    schedule: v.object({
      type: v.literal("weekly"),
      daysOfWeek: v.array(v.number()), // 0=Sun, 1=Mon, ..., 6=Sat
      hour: v.number(), // 0-23
      minute: v.number(), // 0-59
    }),

    // Display
    color: v.string(), // Tailwind color name (emerald, amber, rose, etc.)

    // Status
    enabled: v.boolean(),
    lastTriggeredAt: v.optional(v.number()), // Timestamp of last task creation

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_enabled", ["enabled"])
    .index("by_tenant_enabled", ["tenantId", "enabled"]),
});
