"use client";

import StatusIndicator from "@clawe/ui/components/status-indicator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@clawe/ui/components/tooltip";
import { useAgencyStatus } from "@/hooks/use-agency-status";

type AgencyStatusProps = {
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export const AgencyStatus = ({
  showLabel = false,
  size = "sm",
  className,
}: AgencyStatusProps) => {
  const { status, isLoading } = useAgencyStatus();

  const statusLabel = isLoading
    ? "Checking..."
    : status === "active"
      ? "Online"
      : "Offline";

  const tooltipText = isLoading
    ? "Checking connection..."
    : status === "active"
      ? "Agent service is online and ready"
      : "Unable to connect to agent service";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={className}>
          <StatusIndicator
            state={status}
            size={size}
            label={showLabel ? statusLabel : undefined}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
};
