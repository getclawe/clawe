"use client";

import { ArrowDown } from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";
import { Button } from "@clawe/ui/components/button";

export type ChatScrollButtonProps = {
  onClick: () => void;
  unreadCount?: number;
  className?: string;
};

export const ChatScrollButton = ({
  onClick,
  unreadCount,
  className,
}: ChatScrollButtonProps) => {
  return (
    <div className={cn("sticky bottom-4 flex justify-center", className)}>
      <Button
        variant="secondary"
        size="sm"
        onClick={onClick}
        className="gap-1.5 rounded-full shadow-lg"
      >
        <ArrowDown className="h-4 w-4" />
        {unreadCount && unreadCount > 0 ? (
          <span className="text-xs">{unreadCount} new</span>
        ) : (
          <span className="text-xs">Scroll to bottom</span>
        )}
      </Button>
    </div>
  );
};
