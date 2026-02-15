"use client";

import { useQuery } from "convex/react";
import { api } from "@clawe/backend";
import {
  PageHeader,
  PageHeaderRow,
  PageHeaderTitle,
} from "@dashboard/page-header";
import { Badge } from "@clawe/ui/components/badge";
import { Skeleton } from "@clawe/ui/components/skeleton";
import { deriveStatus, type AgentStatus } from "@clawe/shared/agents";
import { WeeklyRoutineGrid } from "./_components/weekly-routine-grid";

const statusConfig: Record<
  AgentStatus,
  { dotColor: string; bgColor: string; textColor: string; label: string }
> = {
  online: {
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-400",
    label: "Online",
  },
  offline: {
    dotColor: "bg-gray-400",
    bgColor: "",
    textColor: "",
    label: "Offline",
  },
};

const formatLastSeen = (timestamp?: number): string => {
  if (!timestamp) return "Never";
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
};

const AgentsPage = () => {
  const agents = useQuery(api.agents.squad, {});

  return (
    <>
      <PageHeader>
        <PageHeaderRow>
          <PageHeaderTitle>Squad</PageHeaderTitle>
        </PageHeaderRow>
      </PageHeader>

      <div className="space-y-8">
        {/* Agents section */}
        <section>
          <p className="text-muted-foreground mb-4 text-sm">
            Your AI agents and their current status.
          </p>

          {agents === undefined ? (
            <div className="flex flex-wrap gap-4">
              {[1, 2, 3, 4].map((i) => (
                <AgentCardSkeleton key={i} />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <p className="text-muted-foreground">No agents registered yet.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {agents.map((agent) => {
                const status = deriveStatus(agent);
                const config = statusConfig[status];

                return (
                  <div
                    key={agent._id}
                    className="flex w-52 flex-col rounded-lg border p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-3xl">{agent.emoji}</span>
                      {status === "offline" ? (
                        <Badge variant="outline">{config.label}</Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className={`${config.bgColor} ${config.textColor}`}
                        >
                          <span
                            className={`mr-1.5 h-1.5 w-1.5 rounded-full ${config.dotColor}`}
                          />
                          {config.label}
                        </Badge>
                      )}
                    </div>

                    <h3 className="mb-1 font-medium">{agent.name}</h3>
                    <p className="text-muted-foreground text-sm">
                      {agent.role}
                    </p>

                    <div className="mt-auto pt-4">
                      {agent.currentTask ? (
                        <p className="truncate text-xs">
                          <span className="text-muted-foreground">Task: </span>
                          {agent.currentTask.title}
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-xs">
                          Last seen: {formatLastSeen(agent.lastHeartbeat)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Weekly Routines section */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Weekly Routines</h2>
          <WeeklyRoutineGrid />
        </section>
      </div>
    </>
  );
};

const AgentCardSkeleton = () => {
  return (
    <div className="flex w-52 flex-col rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mb-1 h-5 w-20" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-auto h-3 w-32 pt-4" />
    </div>
  );
};

export default AgentsPage;
