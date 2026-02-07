import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("exports a ConvexHttpClient when CONVEX_URL is set", async () => {
    process.env.CONVEX_URL = "https://test.convex.cloud";

    const { client } = await import("./client.js");

    expect(client).toBeDefined();
  });

  it("exits with error when CONVEX_URL is not set", async () => {
    delete process.env.CONVEX_URL;
    const mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

    await import("./client.js").catch(() => {});

    expect(mockError).toHaveBeenCalledWith(
      "Error: CONVEX_URL environment variable is required",
    );
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockError.mockRestore();
  });
});
