"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatAttachment } from "@/components/chat/types";
import { useApiClient } from "@/hooks/use-api-client";
import { fetchAuthToken } from "@/lib/api/client";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
};

export type UseChatOptions = {
  sessionKey: string;
  onError?: (error: Error) => void;
  onFinish?: () => void;
};

export type UseChatReturn = {
  messages: Message[];
  input: string;
  setInput: (input: string) => void;
  status: "idle" | "loading" | "streaming" | "error";
  error: Error | null;
  sendMessage: (text: string, attachments?: ChatAttachment[]) => Promise<void>;
  loadHistory: () => Promise<void>;
  abort: () => void;
  isLoading: boolean;
  isStreaming: boolean;
};

/**
 * System message patterns to filter from chat history.
 */
const SYSTEM_MESSAGE_PATTERNS = [
  /^NO_REPLY$/i,
  /^REPLY_SKIP$/i,
  /^HEARTBEAT_OK$/i,
  /^OK$/i,
  /Read HEARTBEAT\.md.*follow it strictly/i,
  /Check for notifications with ['"]clawe check['"]/i,
  /If nothing needs attention.*reply HEARTBEAT_OK/i,
  /^System:\s*\[\d{4}-\d{2}-\d{2}/i,
  /^Cron:/i,
  /HEARTBEAT_OK/i,
  // Agent startup/system file content
  /^#\s*WORKING\.md/i,
  /---EXIT---/i,
  /clawe not found/i,
  /This file is the shared memory across all agent/i,
  // Gateway events
  /^GatewayRestart:/i,
  /"kind":\s*"config-apply"/,
  /"kind":\s*"config-patch"/,
  /doctorHint/,
  // Queued messages
  /^\[Queued messages while agent was busy\]/i,
  /^Queued #\d+/i,
  // Cron results
  /^System:\s*\[\d{4}-.*Cron:/i,
  /HTTP 429 rate_limit_error/i,
  // Telegram metadata in system context
  /^\[Telegram .* id:\d+/,
  /^\[message_id: \d+\]/,
  /^\[Chat messages since your last reply/i,
  /^\[Mon |^\[Tue |^\[Wed |^\[Thu |^\[Fri |^\[Sat |^\[Sun /i,
];

const isSystemMessage = (content: string): boolean => {
  const trimmed = content.trim();
  if (!trimmed) return true;

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.status || parsed.tool || parsed.error || parsed.result) {
        return true;
      }
    } catch {
      // Not JSON
    }
  }

  return SYSTEM_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed));
};

const extractTextContent = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (b): b is { type: string; text?: string } =>
          typeof b === "object" &&
          b !== null &&
          "type" in b &&
          b.type === "text",
      )
      .map((b) => b.text || "")
      .join("");
  }
  return "";
};

const generateId = () =>
  `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export const useChat = ({
  sessionKey,
  onError,
  onFinish,
}: UseChatOptions): UseChatReturn => {
  const apiClient = useApiClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "streaming" | "error"
  >("idle");
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

  const sendMessage = useCallback(
    async (text: string, attachments?: ChatAttachment[]) => {
      // TODO: Implement attachment support
      void attachments;
      const trimmed = text.trim();
      if (!trimmed) return;

      // Abort previous request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      // Add user message
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: trimmed,
        createdAt: new Date(),
      };

      // Create assistant message placeholder
      const assistantId = generateId();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput("");
      setStatus("streaming");
      setError(null);

      try {
        // Build messages for API (include history)
        const apiMessages = [
          ...messagesRef.current.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: "user" as const, content: trimmed },
        ];

        const token = await fetchAuthToken();
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ sessionKey, messages: apiMessages }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to send message");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Read text stream with throttled UI updates
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let rafId = 0;
        let needsFlush = false;

        const flushUpdate = () => {
          rafId = 0;
          needsFlush = false;
          const content = accumulated;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content } : m)),
          );
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          accumulated += decoder.decode(value, { stream: true });
          needsFlush = true;

          // Batch updates via rAF — at most one DOM update per frame
          if (!rafId) {
            rafId = requestAnimationFrame(flushUpdate);
          }
        }

        // Final flush for any remaining content
        if (rafId) cancelAnimationFrame(rafId);
        if (needsFlush) flushUpdate();

        setStatus("idle");
        onFinish?.();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setStatus("idle");
          return;
        }
        const e = err instanceof Error ? err : new Error("Unknown error");
        setError(e);
        setStatus("error");
        onError?.(e);
      }
    },
    [sessionKey, onError, onFinish],
  );

  const loadHistory = useCallback(async () => {
    setStatus("loading");

    try {
      const response = await apiClient.get<{ messages?: unknown[] }>(
        `/api/chat/history?sessionKey=${encodeURIComponent(sessionKey)}&limit=50`,
      );

      const data = response.data;
      const messages = (data.messages || []) as Array<{
        role?: string;
        content?: unknown;
      }>;
      const historyMessages: Message[] = messages
        .map((msg, i): Message | null => {
          const content = extractTextContent(msg.content);
          if (msg.role === "system" || isSystemMessage(content)) return null;
          return {
            id: `history_${i}`,
            role: msg.role === "user" ? "user" : "assistant",
            content,
          };
        })
        .filter((m): m is Message => m !== null);

      setMessages(historyMessages);
      setStatus("idle");
    } catch (err) {
      // History loading failed - just continue without history
      console.warn("[chat] Failed to load history:", err);
      setStatus("idle");
    }
  }, [sessionKey, apiClient]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

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
};
