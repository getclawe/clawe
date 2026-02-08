"use client";

import { BotMessageSquare } from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";
import { Button } from "@clawe/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@clawe/ui/components/tooltip";
import { useChatPanel } from "@/providers/chat-panel-provider";

export const ChatPanelToggle = () => {
  const { isOpen, toggle } = useChatPanel();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", isOpen && "bg-accent")}
          onClick={toggle}
        >
          <BotMessageSquare className="h-4 w-4" />
          <span className="sr-only">Toggle chat</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isOpen ? "Close chat" : "Open chat"}
      </TooltipContent>
    </Tooltip>
  );
};
