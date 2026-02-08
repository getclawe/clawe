"use client";

import {
  Heart,
  CheckCircle2,
  MessageSquare,
  FileText,
  Bell,
  Zap,
} from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";
import type { FeedActivity } from "./types";

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
};

// Generate a consistent color based on agent name
const getAgentColor = (name: string): string => {
  // Light, colorful pastels
  const colors = [
    "bg-violet-300 dark:bg-violet-400",
    "bg-blue-300 dark:bg-blue-400",
    "bg-emerald-300 dark:bg-emerald-400",
    "bg-amber-300 dark:bg-amber-400",
    "bg-rose-300 dark:bg-rose-400",
    "bg-cyan-300 dark:bg-cyan-400",
    "bg-fuchsia-300 dark:bg-fuchsia-400",
    "bg-teal-300 dark:bg-teal-400",
  ] as const;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (
    colors[Math.abs(hash) % colors.length] ?? "bg-violet-300 dark:bg-violet-400"
  );
};

// Get activity type config
const getActivityConfig = (
  type: FeedActivity["type"],
): { icon: React.ReactNode; color: string; verb: string } => {
  switch (type) {
    case "agent_heartbeat":
      return {
        icon: <Heart className="h-3 w-3" />,
        color: "text-emerald-500",
        verb: "is online",
      };
    case "task_created":
      return {
        icon: <FileText className="h-3 w-3" />,
        color: "text-blue-500",
        verb: "created",
      };
    case "task_assigned":
      return {
        icon: <Zap className="h-3 w-3" />,
        color: "text-amber-500",
        verb: "was assigned",
      };
    case "task_status_changed":
      return {
        icon: <CheckCircle2 className="h-3 w-3" />,
        color: "text-violet-500",
        verb: "updated",
      };
    case "subtask_completed":
      return {
        icon: <CheckCircle2 className="h-3 w-3" />,
        color: "text-emerald-500",
        verb: "completed",
      };
    case "message_sent":
      return {
        icon: <MessageSquare className="h-3 w-3" />,
        color: "text-blue-500",
        verb: "commented",
      };
    case "notification_sent":
      return {
        icon: <Bell className="h-3 w-3" />,
        color: "text-amber-500",
        verb: "notified",
      };
    default:
      return {
        icon: <Zap className="h-3 w-3" />,
        color: "text-muted-foreground",
        verb: "",
      };
  }
};

export type LiveFeedItemProps = {
  activity: FeedActivity;
  isLast?: boolean;
  className?: string;
};

export const LiveFeedItem = ({
  activity,
  isLast = false,
  className,
}: LiveFeedItemProps) => {
  const agentName = activity.agent?.name || "Unknown";
  const agentEmoji = activity.agent?.emoji || "🤖";
  const agentColor = getAgentColor(agentName);
  const config = getActivityConfig(activity.type);

  const taskTitle = activity.task?.title;

  return (
    <div className={cn("group relative flex gap-3", className)}>
      {/* Timeline line */}
      {!isLast && (
        <div className="bg-border absolute top-8 left-4 h-[calc(100%+12px)] w-px" />
      )}

      {/* Avatar with emoji */}
      <div
        className={cn(
          "ring-background relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ring-4",
          agentColor,
        )}
      >
        <span className="text-white drop-shadow-sm">{agentEmoji}</span>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-4">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{agentName}</span>
          <span className={cn("flex items-center gap-1 text-xs", config.color)}>
            {config.icon}
            <span>{config.verb}</span>
          </span>
          {taskTitle && (
            <span className="text-muted-foreground truncate text-xs">
              {taskTitle}
            </span>
          )}
        </div>
        <span className="text-muted-foreground text-xs">
          {formatRelativeTime(activity.createdAt)}
        </span>
      </div>
    </div>
  );
};
