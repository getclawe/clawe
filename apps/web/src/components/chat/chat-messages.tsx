"use client";

import { cn } from "@clawe/ui/lib/utils";
import { ChatMessage } from "./chat-message";
import { ChatEmpty } from "./chat-empty";
import { ChatThinking } from "./chat-thinking";
import type { ChatMessage as ChatMessageType, MessageContent } from "./types";

export type ChatMessagesProps = {
  messages: ChatMessageType[];
  isLoading?: boolean;
  isStreaming?: boolean;
  error?: Error | null;
  className?: string;
};

/**
 * Extract activity description from message content (tool calls, thinking).
 */
function extractActivity(content: MessageContent[]): string | undefined {
  // Look for active tool calls
  for (const block of content) {
    if (
      block.type === "tool_use" ||
      (block as { type: string }).type === "toolCall"
    ) {
      const toolBlock = block as { name?: string };
      const toolName = toolBlock.name;
      if (toolName) {
        // Format tool names nicely
        const formatted = formatToolName(toolName);
        return formatted;
      }
    }
    if (block.type === "thinking") {
      return "Thinking...";
    }
  }
  return undefined;
}

/**
 * Format tool name for display.
 */
function formatToolName(name: string): string {
  const toolLabels: Record<string, string> = {
    read: "Reading file...",
    write: "Writing file...",
    exec: "Running command...",
    search: "Searching...",
    browser: "Browsing...",
    web_search: "Searching the web...",
  };
  return toolLabels[name] || `Running ${name}...`;
}

export const ChatMessages = ({
  messages,
  isLoading,
  isStreaming,
  error,
  className,
}: ChatMessagesProps) => {
  const hasMessages = messages.length > 0;
  const lastMessage = messages[messages.length - 1];

  // Check if the streaming message has any visible text content
  const streamingMessageHasText =
    lastMessage?.isStreaming &&
    lastMessage.content.some(
      (c) => c.type === "text" && c.text.trim().length > 0,
    );

  // Show thinking when:
  // 1. Loading and last message is from user (waiting for assistant)
  // 2. Streaming but no text content yet (assistant is thinking/using tools)
  const showThinking =
    (isLoading && lastMessage?.role === "user") ||
    (isStreaming && lastMessage?.isStreaming && !streamingMessageHasText);

  // Extract current activity from streaming message
  const activity =
    showThinking && lastMessage?.isStreaming
      ? extractActivity(lastMessage.content)
      : undefined;

  if (!hasMessages && !isLoading) {
    return <ChatEmpty className={className} />;
  }

  // Filter out empty streaming messages (we show thinking indicator instead)
  const visibleMessages = messages.filter((msg) => {
    if (
      msg.isStreaming &&
      !msg.content.some((c) => c.type === "text" && c.text.trim().length > 0)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className={cn("flex flex-col gap-4 px-4 py-4", className)}>
      {visibleMessages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {showThinking && <ChatThinking activity={activity} />}

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {error.message}
        </div>
      )}
    </div>
  );
};
