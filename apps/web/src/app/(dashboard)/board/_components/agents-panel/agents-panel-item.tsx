"use client";

import { cn } from "@clawe/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@clawe/ui/components/tooltip";
import type { Agent } from "@clawe/backend/types";

type AgentStatus = "idle" | "active" | "blocked";

const statusConfig: Record<
  AgentStatus,
  { dotColor: string; bgColor: string; textColor: string; text: string }
> = {
  active: {
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
    textColor: "text-emerald-600 dark:text-emerald-400",
    text: "Working",
  },
  idle: {
    dotColor: "bg-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800/50",
    textColor: "text-gray-500 dark:text-gray-400",
    text: "Idle",
  },
  blocked: {
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
    textColor: "text-amber-600 dark:text-amber-400",
    text: "Blocked",
  },
};

// Format relative time like "4 hours ago", "Just now", etc.
const formatRelativeTime = (timestamp?: number): string => {
  if (!timestamp) return "Never";

  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

// Generate a consistent background color from agent name
const getAvatarColor = (name: string) => {
  const colors = [
    "bg-violet-100 dark:bg-violet-900/40",
    "bg-rose-100 dark:bg-rose-900/40",
    "bg-amber-100 dark:bg-amber-900/40",
    "bg-emerald-100 dark:bg-emerald-900/40",
    "bg-sky-100 dark:bg-sky-900/40",
    "bg-fuchsia-100 dark:bg-fuchsia-900/40",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export type AgentsPanelItemProps = {
  agent: Agent;
  collapsed?: boolean;
  selected?: boolean;
  onToggle?: () => void;
};

export const AgentsPanelItem = ({
  agent,
  collapsed = false,
  selected = false,
  onToggle,
}: AgentsPanelItemProps) => {
  const status = (agent.status as AgentStatus) || "idle";
  const { dotColor, bgColor, textColor, text } = statusConfig[status];
  const avatarColor = getAvatarColor(agent.name);

  const avatar = (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center text-lg",
        collapsed ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl",
        avatarColor,
      )}
    >
      {agent.emoji || agent.name.charAt(0)}
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "flex w-full items-center justify-center rounded-md p-1.5 transition-colors",
              selected
                ? "bg-gray-100 ring ring-gray-200 dark:bg-gray-800/50 dark:ring-gray-700"
                : "hover:bg-muted/60",
            )}
          >
            <div className="relative">
              {avatar}
              <span
                className={cn(
                  "absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900",
                  dotColor,
                )}
              />
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p className="font-medium">{agent.name}</p>
          <p className="text-muted-foreground text-xs">{agent.role}</p>
          <p className={cn("mt-1 text-xs", textColor)}>{text}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
        selected
          ? "bg-gray-100 ring ring-gray-200 dark:bg-gray-800/50 dark:ring-gray-700"
          : "hover:bg-muted/60",
      )}
    >
      {/* Avatar */}
      {avatar}

      {/* Name & Role */}
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{agent.name}</span>
        <span className="text-muted-foreground block truncate text-xs">
          {agent.role}
        </span>
      </div>

      {/* Status Badge */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex shrink-0 cursor-default items-center gap-1.5 rounded-full px-2 py-0.5",
              bgColor,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
            <span
              className={cn("text-[10px] font-medium uppercase", textColor)}
            >
              {text}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          <p className="text-xs">
            {status === "active"
              ? "Active now"
              : `Last active: ${formatRelativeTime(agent.lastSeen)}`}
          </p>
        </TooltipContent>
      </Tooltip>
    </button>
  );
};
