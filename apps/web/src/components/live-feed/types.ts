import type { ActivityType, ActivityWithDetails } from "@clawe/backend/types";

// Re-export from shared types for convenience
export type { ActivityType };
export type FeedActivity = ActivityWithDetails;

export type FeedFilter = "all" | "tasks" | "status" | "heartbeats";
