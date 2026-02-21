import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFatal = vi.fn();
vi.mock("./logger.js", () => ({
  logger: { fatal: mockFatal },
}));

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    mockFatal.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validateEnv", () => {
    it("exits when CONVEX_URL is missing", async () => {
      delete process.env.CONVEX_URL;
      process.env.WATCHER_TOKEN = "test-token";

      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { validateEnv } = await import("./config.js");
      validateEnv();

      expect(mockFatal).toHaveBeenCalledWith(
        expect.objectContaining({
          missing: expect.arrayContaining(["CONVEX_URL"]),
        }),
        expect.any(String),
      );
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    it("exits when WATCHER_TOKEN is missing", async () => {
      process.env.CONVEX_URL = "https://test.convex.cloud";
      delete process.env.WATCHER_TOKEN;

      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { validateEnv } = await import("./config.js");
      validateEnv();

      expect(mockFatal).toHaveBeenCalledWith(
        expect.objectContaining({
          missing: expect.arrayContaining(["WATCHER_TOKEN"]),
        }),
        expect.any(String),
      );
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    it("does not exit when all required vars are set", async () => {
      process.env.CONVEX_URL = "https://test.convex.cloud";
      process.env.WATCHER_TOKEN = "test-token";

      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { validateEnv } = await import("./config.js");
      validateEnv();

      expect(mockExit).not.toHaveBeenCalled();

      mockExit.mockRestore();
    });
  });

  describe("config object", () => {
    it("has correct values from env", async () => {
      process.env.CONVEX_URL = "https://test.convex.cloud";
      process.env.WATCHER_TOKEN = "my-watcher-token";

      const { config } = await import("./config.js");

      expect(config.convexUrl).toBe("https://test.convex.cloud");
      expect(config.watcherToken).toBe("my-watcher-token");
    });
  });

  describe("POLL_INTERVAL_MS", () => {
    it("is set to 2000ms", async () => {
      const { POLL_INTERVAL_MS } = await import("./config.js");

      expect(POLL_INTERVAL_MS).toBe(2000);
    });
  });
});
