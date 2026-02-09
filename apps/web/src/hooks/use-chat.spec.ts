import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChat } from "./use-chat";
import axios from "axios";

// Mock axios
vi.mock("axios");
const mockAxiosGet = vi.fn();
(axios.get as unknown) = mockAxiosGet;

// Mock fetch for streaming (sendMessage still uses fetch)
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initial state", () => {
    it("initializes with empty messages", () => {
      const { result } = renderHook(() =>
        useChat({ sessionKey: "test-session" }),
      );

      expect(result.current.messages).toEqual([]);
      expect(result.current.input).toBe("");
      expect(result.current.status).toBe("idle");
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStreaming).toBe(false);
    });
  });

  describe("setInput", () => {
    it("updates input value", () => {
      const { result } = renderHook(() =>
        useChat({ sessionKey: "test-session" }),
      );

      act(() => {
        result.current.setInput("Hello");
      });

      expect(result.current.input).toBe("Hello");
    });
  });

  describe("loadHistory", () => {
    it("loads messages from API", async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: {
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: "Hi" }],
              timestamp: 1234567890,
            },
            {
              role: "assistant",
              content: [{ type: "text", text: "Hello!" }],
              timestamp: 1234567891,
            },
          ],
        },
      });

      const { result } = renderHook(() =>
        useChat({ sessionKey: "test-session" }),
      );

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.status).toBe("idle");
    });

    it("continues gracefully on API failure", async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error("Failed to load"));

      const { result } = renderHook(() =>
        useChat({ sessionKey: "test-session" }),
      );

      await act(async () => {
        await result.current.loadHistory();
      });

      // History loading failures should not put chat in error state
      expect(result.current.status).toBe("idle");
      expect(result.current.messages).toEqual([]);
    });
  });

  describe("sendMessage", () => {
    it("does not send empty messages", async () => {
      const { result } = renderHook(() =>
        useChat({ sessionKey: "test-session" }),
      );

      await act(async () => {
        await result.current.sendMessage("   ");
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("adds user message immediately", async () => {
      // Mock SSE response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('event: connected\ndata: {"sessionKey":"test"}\n\n'),
          );
          controller.enqueue(
            encoder.encode(
              'event: final\ndata: {"message":{"content":[{"type":"text","text":"Hi!"}]}}\n\n',
            ),
          );
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const { result } = renderHook(() =>
        useChat({ sessionKey: "test-session" }),
      );

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      // Should have user message and assistant response
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThanOrEqual(1);
        expect(result.current.messages[0]?.role).toBe("user");
      });
    });
  });

  describe("abort", () => {
    it("sets status to idle when aborting", () => {
      const { result } = renderHook(() =>
        useChat({ sessionKey: "test-session" }),
      );

      act(() => {
        result.current.abort();
      });

      expect(result.current.status).toBe("idle");
    });
  });
});
