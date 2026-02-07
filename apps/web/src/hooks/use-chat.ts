"use client";

import { useState, useCallback, useRef } from "react";
import type {
  ChatMessage,
  ChatStatus,
  ChatAttachment,
  UseChatOptions,
  UseChatReturn,
  MessageContent,
} from "@/components/chat/types";

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Extract text content from a message object.
 */
function extractTextFromMessage(message: unknown): string {
  if (!message || typeof message !== "object") {
    return "";
  }

  const msg = message as { content?: unknown };
  const content = msg.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter(
        (block): block is { type: "text"; text: string } =>
          typeof block === "object" &&
          block !== null &&
          "type" in block &&
          block.type === "text" &&
          "text" in block &&
          typeof block.text === "string",
      )
      .map((block) => block.text)
      .join("");
  }

  return "";
}

/**
 * Check if text content is internal/debug content that should be hidden.
 */
function isInternalContent(text: string): boolean {
  const trimmed = text.trim();

  if (/^Thinking:\s/i.test(trimmed)) {
    return true;
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.status || parsed.tool || parsed.error || parsed.result) {
        return true;
      }
    } catch {
      // Not valid JSON, keep it
    }
  }

  if (
    trimmed.startsWith("# IDENTITY.md") ||
    trimmed.startsWith("# MEMORY.md")
  ) {
    return true;
  }

  return false;
}

/**
 * Filter content blocks to only include displayable content.
 */
function filterDisplayableContent(content: unknown[]): MessageContent[] {
  return content
    .filter((block): block is MessageContent => {
      if (!block || typeof block !== "object" || !("type" in block)) {
        return false;
      }
      const blockType = (block as { type: string }).type;

      if (blockType !== "text") {
        return false;
      }

      const textBlock = block as { type: "text"; text: string };
      if (
        typeof textBlock.text === "string" &&
        isInternalContent(textBlock.text)
      ) {
        return false;
      }

      return true;
    })
    .map((block) => block as MessageContent);
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Parse raw message from API into ChatMessage format.
 */
function parseHistoryMessage(msg: unknown, index: number): ChatMessage {
  const m = msg as {
    role?: string;
    content?: unknown;
    timestamp?: number;
  };

  let content: MessageContent[];
  if (Array.isArray(m.content)) {
    content = m.content
      .filter((block: unknown) => {
        const b = block as { type?: string };
        return b.type === "text" || b.type === "image";
      })
      .map((block) => block as MessageContent);

    if (content.length === 0) {
      content = [{ type: "text", text: "" }];
    }
  } else {
    content = [{ type: "text", text: String(m.content || "") }];
  }

  const role =
    m.role === "user" || m.role === "assistant" || m.role === "system"
      ? m.role
      : "assistant";

  return {
    id: generateMessageId() + index,
    role,
    content,
    timestamp: m.timestamp || Date.now(),
  };
}

/**
 * Collapse consecutive assistant messages, keeping only the last one before each user message.
 */
function collapseAssistantMessages(messages: ChatMessage[]): ChatMessage[] {
  const result: ChatMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg) continue;

    const nextMsg = messages[i + 1];

    if (msg.role === "user") {
      result.push(msg);
    } else if (msg.role === "assistant") {
      if (!nextMsg || nextMsg.role === "user") {
        result.push(msg);
      }
    }
  }

  return result;
}

/**
 * Custom hook for managing chat state and communication.
 */
export function useChat({
  sessionKey,
  onError,
  onFinish,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRunIdRef = useRef<string | null>(null);
  const streamingTextRef = useRef<string>("");

  const loadHistory = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch(
        `/api/chat/history?sessionKey=${encodeURIComponent(sessionKey)}&limit=200`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load history");
      }

      const data = await response.json();
      const historyMessages = (data.messages || []).map(parseHistoryMessage);
      const collapsedMessages = collapseAssistantMessages(historyMessages);

      setMessages(collapsedMessages);
      setStatus("idle");
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      setStatus("error");
      onError?.(error);
    }
  }, [sessionKey, onError]);

  const handleSSEEvent = useCallback(
    (eventType: string, data: unknown, assistantMessageId: string) => {
      const eventData = data as Record<string, unknown>;

      switch (eventType) {
        case "connected":
          break;

        case "delta": {
          if (eventData.runId) {
            currentRunIdRef.current = eventData.runId as string;
          }

          const message = eventData.message as
            | { content?: unknown[] }
            | undefined;
          const rawContent = message?.content;

          const newText = extractTextFromMessage(eventData.message);
          if (newText && newText.length > streamingTextRef.current.length) {
            streamingTextRef.current = newText;
          }

          const contentBlocks: MessageContent[] = [];

          if (streamingTextRef.current) {
            contentBlocks.push({
              type: "text",
              text: streamingTextRef.current,
            });
          }

          if (Array.isArray(rawContent)) {
            for (const block of rawContent) {
              const b = block as { type?: string };
              if (
                b.type === "tool_use" ||
                b.type === "toolCall" ||
                b.type === "thinking"
              ) {
                contentBlocks.push(block as MessageContent);
              }
            }
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content:
                      contentBlocks.length > 0
                        ? contentBlocks
                        : [{ type: "text", text: "" }],
                  }
                : msg,
            ),
          );
          break;
        }

        case "final": {
          const finalMessage = eventData.message as ChatMessage | undefined;
          const rawContent = finalMessage?.content;
          const filteredContent = Array.isArray(rawContent)
            ? filterDisplayableContent(rawContent)
            : [];

          const finalContent =
            filteredContent.length > 0
              ? filteredContent
              : [{ type: "text" as const, text: streamingTextRef.current }];

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: finalContent, isStreaming: false }
                : msg,
            ),
          );

          setStatus("idle");
          onFinish?.({
            id: assistantMessageId,
            role: "assistant",
            content: finalContent,
            timestamp: Date.now(),
          });
          break;
        }

        case "error": {
          const errorMessage =
            (eventData.message as string) || "An error occurred";
          setError(new Error(errorMessage));
          setStatus("error");

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: [{ type: "text", text: `Error: ${errorMessage}` }],
                    isStreaming: false,
                  }
                : msg,
            ),
          );
          break;
        }

        case "aborted": {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, isStreaming: false }
                : msg,
            ),
          );
          setStatus("idle");
          break;
        }
      }
    },
    [onFinish],
  );

  const sendMessage = useCallback(
    async (text: string, attachments?: ChatAttachment[]) => {
      const trimmedText = text.trim();
      if (!trimmedText && (!attachments || attachments.length === 0)) {
        return;
      }

      const userContent: MessageContent[] = [];
      if (trimmedText) {
        userContent.push({ type: "text", text: trimmedText });
      }
      if (attachments) {
        for (const att of attachments) {
          userContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: att.mimeType,
              data: att.dataUrl.replace(/^data:[^;]+;base64,/, ""),
            },
          });
        }
      }

      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: userContent,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setStatus("loading");
      setError(null);
      streamingTextRef.current = "";

      abortControllerRef.current = new AbortController();

      const timeoutId = setTimeout(() => {
        setError(new Error("Request timed out. Please try again."));
        setStatus("error");
        abortControllerRef.current?.abort();
      }, REQUEST_TIMEOUT_MS);

      try {
        const body = {
          sessionKey,
          message: trimmedText,
          attachments: attachments?.map((att) => ({
            type: "image",
            mimeType: att.mimeType,
            content: att.dataUrl.replace(/^data:[^;]+;base64,/, ""),
          })),
        };

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to send message");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const assistantMessageId = generateMessageId();
        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          role: "assistant",
          content: [{ type: "text", text: "" }],
          timestamp: Date.now(),
          isStreaming: true,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStatus("streaming");
        clearTimeout(timeoutId);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data = JSON.parse(line.slice(6));
                handleSSEEvent(eventType, data, assistantMessageId);
              } catch {
                // Ignore parse errors
              }
              eventType = "";
            }
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        setStatus("error");
        onError?.(error);
      } finally {
        clearTimeout(timeoutId);
        abortControllerRef.current = null;
        currentRunIdRef.current = null;
      }
    },
    [sessionKey, onError, handleSSEEvent],
  );

  const abort = useCallback(async () => {
    abortControllerRef.current?.abort();

    try {
      await fetch("/api/chat/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey,
          runId: currentRunIdRef.current,
        }),
      });
    } catch {
      // Ignore abort errors
    }

    setStatus("idle");
  }, [sessionKey]);

  return {
    messages,
    input,
    setInput,
    status,
    error,
    sendMessage,
    loadHistory,
    abort,
    isLoading: status === "loading",
    isStreaming: status === "streaming",
  };
}
