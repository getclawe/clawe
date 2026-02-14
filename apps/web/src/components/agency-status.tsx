"use client";

import { cn } from "@clawe/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@clawe/ui/components/tooltip";
import { useAgencyStatus } from "@/hooks/use-agency-status";

type AgencyStatusProps = {
  className?: string;
};

const statusConfig = {
  active: {
    label: "Connected",
    dot: "bg-green-500",
    ping: "bg-green-400",
  },
  down: {
    label: "Offline",
    dot: "bg-red-500",
    ping: "bg-red-400",
  },
  idle: {
    label: "Idle",
    dot: "bg-gray-400",
    ping: "bg-gray-300",
  },
};

export const AgencyStatus = ({ className }: AgencyStatusProps) => {
  const { status, isLoading } = useAgencyStatus();

  const config = isLoading
    ? { label: "Connecting", dot: "bg-yellow-500", ping: "bg-yellow-400" }
    : statusConfig[status];

  const tooltipText = isLoading
    ? "Checking connection..."
    : status === "active"
      ? "Agency service is online and ready"
      : "Unable to connect to agency service";

  const shouldAnimate = isLoading || status === "active";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 dark:border-zinc-700 dark:bg-zinc-800/50",
            className,
          )}
        >
          <div className="relative flex items-center">
            {shouldAnimate && (
              <span
                className={cn(
                  "absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-75",
                  config.ping,
                )}
              />
            )}
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                config.dot,
              )}
            />
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {config.label}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
};
