"use client";

import { ScrollArea } from "@clawe/ui/components/scroll-area";
import { cn } from "@clawe/ui/lib/utils";
import type { Agent } from "@clawe/backend/types";
import { AgentsPanelItem } from "./agents-panel-item";

export type AgentsPanelListProps = {
  agents: Agent[];
  collapsed?: boolean;
  selectedAgentIds?: string[];
  onToggleAgent?: (agentId: string) => void;
};

export const AgentsPanelList = ({
  agents,
  collapsed = false,
  selectedAgentIds = [],
  onToggleAgent,
}: AgentsPanelListProps) => {
  return (
    <ScrollArea className="flex-1">
      <div className={cn("space-y-1", collapsed ? "px-1 py-2" : "p-2")}>
        {agents.map((agent) => (
          <AgentsPanelItem
            key={agent._id}
            agent={agent}
            collapsed={collapsed}
            selected={selectedAgentIds.includes(agent._id)}
            onToggle={() => onToggleAgent?.(agent._id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
};
