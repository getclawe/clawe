import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosResponse } from "axios";

// Hoist mock functions so they're available when vi.mock runs
const { mockPost, mockGet } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
}));

// Mock axios before importing the client
vi.mock("axios", () => ({
  default: {
    create: () => ({
      post: mockPost,
    }),
    get: mockGet,
    isAxiosError: (error: unknown): error is { response?: AxiosResponse } => {
      return (
        error !== null &&
        typeof error === "object" &&
        "isAxiosError" in error &&
        (error as { isAxiosError: boolean }).isAxiosError === true
      );
    },
  },
}));

// Import after mocking
import {
  checkHealth,
  saveTelegramBotToken,
  probeTelegramToken,
  patchConfig,
} from "./client";
import type { SquadhubConnection } from "./client";

const connection: SquadhubConnection = {
  squadhubUrl: "http://localhost:18789",
  squadhubToken: "test-token",
};

describe("Squadhub Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkHealth", () => {
    it("returns ok when gateway responds to config.get", async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          ok: true,
          result: { config: { channels: {} }, hash: "abc123" },
        },
      });

      const result = await checkHealth(connection);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.result.hash).toBe("abc123");
      }
    });

    it("returns error when gateway is unreachable", async () => {
      mockPost.mockRejectedValueOnce(new Error("Network error"));

      const result = await checkHealth(connection);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("unreachable");
      }
    });

    it("returns error when gateway returns error response", async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          ok: false,
          error: { type: "auth_error", message: "Unauthorized" },
        },
      });

      const result = await checkHealth(connection);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("unhealthy");
      }
    });
  });

  describe("probeTelegramToken", () => {
    it("returns bot info when token is valid", async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          ok: true,
          result: {
            id: 123456789,
            username: "my_bot",
            can_join_groups: true,
            can_read_all_group_messages: false,
          },
        },
      });

      const result = await probeTelegramToken("123456:ABC-DEF");
      expect(result.ok).toBe(true);
      expect(result.bot?.username).toBe("my_bot");
      expect(mockGet).toHaveBeenCalledWith(
        "https://api.telegram.org/bot123456:ABC-DEF/getMe",
      );
    });

    it("returns error when token is invalid", async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          ok: false,
          description: "Unauthorized",
        },
      });

      const result = await probeTelegramToken("invalid-token");
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error when API call fails", async () => {
      mockGet.mockRejectedValueOnce(new Error("Network error"));

      const result = await probeTelegramToken("123456:ABC-DEF");
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Failed to connect to Telegram API");
    });
  });

  describe("saveTelegramBotToken", () => {
    it("patches config with Telegram bot token and enabled flag", async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          ok: true,
          result: { success: true, hash: "abc123" },
        },
      });

      const result = await saveTelegramBotToken(connection, "123456:ABC-DEF");
      expect(result.ok).toBe(true);

      expect(mockPost).toHaveBeenCalledWith("/tools/invoke", {
        tool: "gateway",
        action: "config.patch",
        args: {
          raw: expect.stringContaining('"enabled":true'),
          baseHash: undefined,
        },
      });
    });
  });

  describe("patchConfig", () => {
    it("sends config patch request", async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          ok: true,
          result: { success: true, hash: "abc123" },
        },
      });

      const result = await patchConfig(connection, {
        models: { providers: { anthropic: { apiKey: "sk-test" } } },
      });

      expect(result.ok).toBe(true);
      expect(mockPost).toHaveBeenCalledWith("/tools/invoke", {
        tool: "gateway",
        action: "config.patch",
        args: {
          raw: expect.stringContaining("anthropic"),
          baseHash: undefined,
        },
      });
    });

    it("returns error on HTTP error", async () => {
      const axiosError = Object.assign(new Error("Request failed"), {
        isAxiosError: true,
        response: {
          status: 401,
          statusText: "Unauthorized",
        },
      });

      mockPost.mockRejectedValueOnce(axiosError);

      const result = await patchConfig(connection, { test: true });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("http_error");
        expect(result.error.message).toContain("401");
      }
    });

    it("returns error on network error", async () => {
      mockPost.mockRejectedValueOnce(new Error("Network error"));

      const result = await patchConfig(connection, { test: true });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("network_error");
      }
    });
  });
});
