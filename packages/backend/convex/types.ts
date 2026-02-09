/**
 * Shared types for Convex query results.
 *
 * These types represent the enriched data returned by queries,
 * including joined/computed fields. Use these instead of
 * duplicating type definitions in frontend components.
 */

import type { Doc, Id } from "./_generated/dataModel";

// =============================================================================
// Agent Types
// =============================================================================

/** Agent as returned by agents.list query */
export type Agent = Doc<"agents">;

/** Minimal agent info used in enriched results */
export type AgentSummary = {
  _id: Id<"agents">;
  name: string;
  emoji?: string;
};

// =============================================================================
// Task Types
// =============================================================================

/** Task as returned by tasks.list query (with enriched assignees and document count) */
export type TaskWithAssignees = Doc<"tasks"> & {
  assignees: AgentSummary[];
  documentCount: number;
};

/** Subtask within a task (from embedded array) */
export type Subtask = NonNullable<Doc<"tasks">["subtasks"]>[number];

/** Enriched subtask with assignee info */
export type SubtaskWithAssignee = Subtask & {
  assignee: AgentSummary | null;
};

// =============================================================================
// Document Types
// =============================================================================

/** Document as returned by documents.getForTask query (with enriched creator and file URL) */
export type DocumentWithCreator = Doc<"documents"> & {
  fileUrl: string | null;
  creator: AgentSummary | null;
};

// =============================================================================
// Activity Types
// =============================================================================

/** Activity type enum from schema */
export type ActivityType = Doc<"activities">["type"];

/** Activity as returned by activities.feed query (with enriched agent and task) */
export type ActivityWithDetails = Doc<"activities"> & {
  agent: AgentSummary | null;
  task: {
    _id: Id<"tasks">;
    title: string;
    status: string;
  } | null;
};

// =============================================================================
// Notification Types
// =============================================================================

/** Notification with enriched source agent and task */
export type NotificationWithDetails = Doc<"notifications"> & {
  sourceAgent: AgentSummary | null;
  task: {
    _id: Id<"tasks">;
    title: string;
    status: string;
  } | null;
};
