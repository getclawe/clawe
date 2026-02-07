"use client";

import { MessageSquare } from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";

export type ChatEmptyProps = {
  className?: string;
};

export const ChatEmpty = ({ className }: ChatEmptyProps) => {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center px-4 py-12 text-center",
        className,
      )}
    >
      <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
        <MessageSquare className="text-muted-foreground h-6 w-6" />
      </div>

      <h3 className="text-foreground mb-2 text-lg font-semibold">
        Start a conversation
      </h3>

      <p className="text-muted-foreground max-w-sm text-sm">
        Send a message to begin chatting with the AI assistant. You can also
        attach images by clicking the paperclip icon.
      </p>
    </div>
  );
};
