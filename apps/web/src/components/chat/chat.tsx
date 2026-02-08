"use client";

import { useEffect, useRef } from "react";
import { cn } from "@clawe/ui/lib/utils";
import { ScrollArea } from "@clawe/ui/components/scroll-area";
import { useChat } from "@/hooks/use-chat";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { ChatScrollButton } from "./chat-scroll-button";
import type { ChatAttachment } from "./types";

export type ChatProps = {
  sessionKey: string;
  mode?: "panel" | "full";
  onClose?: () => void;
  className?: string;
  /** Hide the header (title and border) */
  hideHeader?: boolean;
  /** Auto-send this message when history is empty after loading */
  autoSendMessage?: string;
};

export const Chat = ({
  sessionKey,
  mode = "full",
  onClose,
  className,
  hideHeader = false,
  autoSendMessage,
}: ChatProps) => {
  const {
    messages,
    input,
    setInput,
    error,
    sendMessage,
    loadHistory,
    abort,
    isLoading,
    isStreaming,
  } = useChat({ sessionKey });

  const { scrollRef, showScrollButton, scrollToBottom } = useAutoScroll();
  const autoSendTriggered = useRef(false);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Auto-send message when history is empty (only once)
  useEffect(() => {
    if (
      autoSendMessage &&
      !autoSendTriggered.current &&
      !isLoading &&
      messages.length === 0
    ) {
      autoSendTriggered.current = true;
      sendMessage(autoSendMessage);
    }
  }, [autoSendMessage, isLoading, messages.length, sendMessage]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode === "panel" && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, onClose]);

  const handleSend = async (text: string, attachments?: ChatAttachment[]) => {
    await sendMessage(text, attachments);
  };

  const handleStop = () => {
    abort();
  };

  return (
    <div
      className={cn(
        "bg-background flex h-full flex-col",
        mode === "panel" && "border-l",
        mode === "full" && "mx-auto w-full max-w-5xl px-4 md:px-6 lg:px-8",
        className,
      )}
    >
      {!hideHeader && (
        <ChatHeader mode={mode} onClose={onClose} isStreaming={isStreaming} />
      )}

      <div className="relative min-h-0 flex-1">
        <ScrollArea ref={scrollRef} className="h-full">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            isStreaming={isStreaming}
            error={error}
          />
        </ScrollArea>

        {showScrollButton && (
          <ChatScrollButton onClick={() => scrollToBottom()} />
        )}
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={handleStop}
        isLoading={isLoading}
        isStreaming={isStreaming}
      />
    </div>
  );
};
