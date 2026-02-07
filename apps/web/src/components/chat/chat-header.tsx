"use client";

import { X } from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";
import { Button } from "@clawe/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@clawe/ui/components/tooltip";

export type ChatHeaderProps = {
  mode?: "panel" | "full";
  onClose?: () => void;
  isStreaming?: boolean;
  className?: string;
};

export const ChatHeader = ({
  mode = "full",
  onClose,
  isStreaming,
  className,
}: ChatHeaderProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b px-4 py-3",
        mode === "panel" && "px-3 py-2",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <h2
          className={cn(
            "text-foreground font-semibold",
            mode === "panel" ? "text-sm" : "text-lg",
          )}
        >
          Chat
        </h2>
        {isStreaming && (
          <span className="text-muted-foreground text-xs">Generating...</span>
        )}
      </div>

      {mode === "panel" && onClose && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
