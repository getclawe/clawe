"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Wrench,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";
import { Button } from "@clawe/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@clawe/ui/components/collapsible";
import type { ToolUseContent } from "./types";

export type ChatToolEventProps = {
  tool: ToolUseContent;
  className?: string;
};

export const ChatToolEvent = ({ tool, className }: ChatToolEventProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const status = tool.status ?? "completed";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn("border-border bg-muted/30 rounded-lg border", className)}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="hover:bg-muted/50 flex w-full items-center justify-between px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <StatusIcon status={status} />
              <Wrench className="text-muted-foreground h-3.5 w-3.5" />
              <span className="text-sm font-medium">{tool.name}</span>
            </div>
            {isOpen ? (
              <ChevronDown className="text-muted-foreground h-4 w-4" />
            ) : (
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-border border-t px-3 py-2">
            <div className="text-muted-foreground text-xs font-medium">
              Input
            </div>
            <pre className="mt-1 overflow-x-auto text-xs whitespace-pre-wrap">
              {formatToolInput(tool.input)}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

type StatusIconProps = {
  status: "running" | "completed" | "error";
};

const StatusIcon = ({ status }: StatusIconProps) => {
  switch (status) {
    case "running":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />;
    case "completed":
      return <Check className="h-3.5 w-3.5 text-green-500" />;
    case "error":
      return <AlertCircle className="text-destructive h-3.5 w-3.5" />;
    default:
      return null;
  }
};

function formatToolInput(input: unknown): string {
  if (typeof input === "string") {
    return input;
  }
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}
