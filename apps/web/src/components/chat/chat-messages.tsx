"use client";

import { cn } from "@clawe/ui/lib/utils";
import { Spinner } from "@clawe/ui/components/spinner";
import { ChatMessage } from "./chat-message";
import { ChatEmpty } from "./chat-empty";
import { ChatThinking } from "./chat-thinking";
import type { Message } from "@/hooks/use-chat";

export type ChatMessagesProps = {
  messages: Message[];
  isLoading?: boolean;
  isStreaming?: boolean;
  error?: Error | null;
  className?: string;
};

export const ChatMessages = ({
  messages,
  isLoading,
  isStreaming,
  error,
  className,
}: ChatMessagesProps) => {
  const hasMessages = messages.length > 0;
  const lastMessage = messages[messages.length - 1];

  // Show thinking when streaming and last assistant message is empty
  const showThinking =
    isStreaming && lastMessage?.role === "assistant" && !lastMessage.content;

  // Show loading spinner when fetching history
  if (isLoading && !hasMessages) {
    return (
      <div
        className={cn(
          "flex min-h-[50vh] items-center justify-center px-4",
          className,
        )}
      >
        <div className="text-muted-foreground flex flex-col items-center gap-2">
          <Spinner className="h-6 w-6" />
          <span className="text-sm">Loading messages...</span>
        </div>
      </div>
    );
  }

  if (!hasMessages && !isStreaming) {
    return <ChatEmpty className={className} />;
  }

  // Filter out empty assistant messages (we show thinking indicator instead)
  const visibleMessages = messages.filter(
    (msg) => !(msg.role === "assistant" && !msg.content.trim()),
  );

  return (
    <div className={cn("flex flex-col gap-4 px-4 py-4", className)}>
      {visibleMessages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {showThinking && <ChatThinking />}

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {error.message}
        </div>
      )}
    </div>
  );
};
