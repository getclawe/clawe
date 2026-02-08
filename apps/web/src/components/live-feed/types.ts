import type { Doc, Id } from "@clawe/backend/dataModel";

// Activity type from backend schema
export type ActivityType = Doc<"activities">["type"];

// Enriched activity returned by activities.feed query
export type FeedActivity = Doc<"activities"> & {
  agent: {
    _id: Id<"agents">;
    name: string;
    emoji?: string;
  } | null;
  task: {
    _id: Id<"tasks">;
    title: string;
    status: string;
  } | null;
};

export type FeedFilter = "all" | "tasks" | "status" | "heartbeats";
