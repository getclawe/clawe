"use client";

import { useQuery } from "convex/react";
import { api } from "@clawe/backend";
import {
  PageHeader,
  PageHeaderRow,
  PageHeaderTitle,
} from "@dashboard/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@clawe/ui/components/card";
import { Badge } from "@clawe/ui/components/badge";

type AgentStatus = "idle" | "active" | "blocked";

const statusColors: Record<AgentStatus, string> = {
  idle: "bg-gray-500",
  active: "bg-green-500",
  blocked: "bg-red-500",
};

function getStatusColor(status: string): string {
  if (status === "idle" || status === "active" || status === "blocked") {
    return statusColors[status];
  }
  return statusColors.idle;
}

const AgentsPage = () => {
  const agents = useQuery(api.agents.squad);

  return (
    <>
      <PageHeader>
        <PageHeaderRow>
          <PageHeaderTitle>Squad</PageHeaderTitle>
        </PageHeaderRow>
      </PageHeader>

      <div className="p-6">
        {!agents ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : agents.length === 0 ? (
          <div className="text-muted-foreground">No agents registered yet.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {agents.map((agent) => (
              <Card key={agent._id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">{agent.emoji}</span>
                    <span>{agent.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Role</span>
                      <span>{agent.role}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1.5"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${getStatusColor(agent.status)}`}
                        />
                        {agent.status || "idle"}
                      </Badge>
                    </div>
                    {agent.currentTask && (
                      <div className="border-t pt-2">
                        <span className="text-muted-foreground text-xs">
                          Working on:
                        </span>
                        <p className="truncate font-medium">
                          {agent.currentTask.title}
                        </p>
                      </div>
                    )}
                    {agent.lastHeartbeat && (
                      <div className="text-muted-foreground text-xs">
                        Last seen:{" "}
                        {new Date(agent.lastHeartbeat).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default AgentsPage;
