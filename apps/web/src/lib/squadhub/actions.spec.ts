import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the shared package
vi.mock("@clawe/shared/squadhub", () => ({
  checkHealth: vi.fn(),
  getConfig: vi.fn(),
  saveTelegramBotToken: vi.fn(),
  probeTelegramToken: vi.fn(),
  approveChannelPairingCode: vi.fn(),
}));

import {
  saveTelegramBotToken,
  validateTelegramToken,
  checkSquadhubHealth,
} from "./actions";
import {
  checkHealth,
  saveTelegramBotToken as saveTelegramBotTokenClient,
  probeTelegramToken,
} from "@clawe/shared/squadhub";

describe("Squadhub Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateTelegramToken", () => {
    it("returns bot info for valid token", async () => {
      vi.mocked(probeTelegramToken).mockResolvedValueOnce({
        ok: true,
        bot: { id: 123, username: "test_bot" },
      });

      const result = await validateTelegramToken("123456:ABC-DEF");
      expect(result.ok).toBe(true);
      expect(probeTelegramToken).toHaveBeenCalledWith("123456:ABC-DEF");
    });
  });

  describe("saveTelegramBotToken", () => {
    it("validates token then saves to config", async () => {
      vi.mocked(probeTelegramToken).mockResolvedValueOnce({
        ok: true,
        bot: { id: 123, username: "test_bot" },
      });
      vi.mocked(saveTelegramBotTokenClient).mockResolvedValueOnce({
        ok: true,
        result: {
          content: [{ type: "text", text: "Config updated" }],
          details: { success: true, hash: "abc" },
        },
      });

      const result = await saveTelegramBotToken("123456:ABC-DEF");

      expect(probeTelegramToken).toHaveBeenCalledWith("123456:ABC-DEF");
      expect(saveTelegramBotTokenClient).toHaveBeenCalledWith(
        expect.objectContaining({
          squadhubUrl: expect.any(String),
          squadhubToken: expect.any(String),
        }),
        "123456:ABC-DEF",
      );
      expect(result.ok).toBe(true);
    });

    it("returns error if token validation fails", async () => {
      vi.mocked(probeTelegramToken).mockResolvedValueOnce({
        ok: false,
        error: "Unauthorized",
      });

      const result = await saveTelegramBotToken("invalid-token");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("invalid_token");
      }
      expect(saveTelegramBotTokenClient).not.toHaveBeenCalled();
    });
  });

  describe("checkSquadhubHealth", () => {
    it("returns health status", async () => {
      vi.mocked(checkHealth).mockResolvedValueOnce({
        ok: true,
        result: {
          content: [{ type: "text", text: "Config retrieved" }],
          details: { config: { channels: {} }, hash: "abc123" },
        },
      });

      const result = await checkSquadhubHealth();
      expect(result.ok).toBe(true);
    });
  });
});
