import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validateEnv", () => {
    it("exits when CONVEX_URL is missing", async () => {
      delete process.env.CONVEX_URL;
      process.env.AGENCY_URL = "http://localhost:18789";
      process.env.AGENCY_TOKEN = "test-token";

      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);
      const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

      const { validateEnv } = await import("./config.js");
      validateEnv();

      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("CONVEX_URL"),
      );
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
      mockError.mockRestore();
    });

    it("exits when AGENCY_URL is missing", async () => {
      process.env.CONVEX_URL = "https://test.convex.cloud";
      delete process.env.AGENCY_URL;
      process.env.AGENCY_TOKEN = "test-token";

      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);
      const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

      const { validateEnv } = await import("./config.js");
      validateEnv();

      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("AGENCY_URL"),
      );
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
      mockError.mockRestore();
    });

    it("does not exit when all required vars are set", async () => {
      process.env.CONVEX_URL = "https://test.convex.cloud";
      process.env.AGENCY_URL = "http://localhost:18789";
      process.env.AGENCY_TOKEN = "test-token";

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
    it("has correct default values", async () => {
      process.env.CONVEX_URL = "https://test.convex.cloud";
      process.env.AGENCY_URL = "http://custom:8080";
      process.env.AGENCY_TOKEN = "my-token";

      const { config } = await import("./config.js");

      expect(config.convexUrl).toBe("https://test.convex.cloud");
      expect(config.agencyUrl).toBe("http://custom:8080");
      expect(config.agencyToken).toBe("my-token");
    });
  });

  describe("POLL_INTERVAL_MS", () => {
    it("is set to 2000ms", async () => {
      const { POLL_INTERVAL_MS } = await import("./config.js");

      expect(POLL_INTERVAL_MS).toBe(2000);
    });
  });
});
