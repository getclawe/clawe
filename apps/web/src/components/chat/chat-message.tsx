"use client";

import { Bot, User } from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";
import { ChatMessageContent } from "./chat-message-content";
import type { ChatMessage as ChatMessageType } from "./types";

export type ChatMessageProps = {
  message: ChatMessageType;
  className?: string;
};

export const ChatMessage = ({ message, className }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming;

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        className,
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
            isStreaming && "animate-pulse",
          )}
        >
          <ChatMessageContent content={message.content} />
        </div>

        {/* Timestamp */}
        {message.timestamp && !isStreaming && (
          <span className="text-muted-foreground px-1 text-xs">
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
