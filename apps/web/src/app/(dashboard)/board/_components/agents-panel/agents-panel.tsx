"use client";

import { useQuery } from "convex/react";
import { api } from "@clawe/backend";
import { cn } from "@clawe/ui/lib/utils";
import { Loader2 } from "lucide-react";
import { AgentsPanelHeader } from "./agents-panel-header";
import { AgentsPanelList } from "./agents-panel-list";

export type AgentsPanelProps = {
  className?: string;
  collapsed?: boolean;
  selectedAgentIds?: string[];
  onSelectionChange?: (agentIds: string[]) => void;
};

export const AgentsPanel = ({
  className,
  collapsed = false,
  selectedAgentIds = [],
  onSelectionChange,
}: AgentsPanelProps) => {
  const agents = useQuery(api.agents.squad, {});

  const total = agents?.length ?? 0;

  const handleToggleAgent = (agentId: string) => {
    if (!onSelectionChange) return;

    if (selectedAgentIds.includes(agentId)) {
      onSelectionChange(selectedAgentIds.filter((id) => id !== agentId));
    } else {
      onSelectionChange([...selectedAgentIds, agentId]);
    }
  };

  return (
    <div className={cn("flex h-full flex-col border-r", className)}>
      <AgentsPanelHeader total={total} collapsed={collapsed} />

      {!agents ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center px-4 text-center text-sm">
          {!collapsed && "No agents yet"}
        </div>
      ) : (
        <AgentsPanelList
          agents={agents}
          collapsed={collapsed}
          selectedAgentIds={selectedAgentIds}
          onToggleAgent={handleToggleAgent}
        />
      )}
    </div>
  );
};
