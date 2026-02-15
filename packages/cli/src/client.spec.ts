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

  it("exports query, mutation, action wrappers when CONVEX_URL is set", async () => {
    process.env.CONVEX_URL = "https://test.convex.cloud";

    const mod = await import("./client.js");

    expect(mod.query).toBeTypeOf("function");
    expect(mod.mutation).toBeTypeOf("function");
    expect(mod.action).toBeTypeOf("function");
    expect(mod.uploadFile).toBeTypeOf("function");
  });

  it("exports machineToken from SQUADHUB_TOKEN env var", async () => {
    process.env.CONVEX_URL = "https://test.convex.cloud";
    process.env.SQUADHUB_TOKEN = "test-machine-token";

    const { machineToken } = await import("./client.js");

    expect(machineToken).toBe("test-machine-token");
  });

  it("defaults machineToken to empty string when SQUADHUB_TOKEN is not set", async () => {
    process.env.CONVEX_URL = "https://test.convex.cloud";
    delete process.env.SQUADHUB_TOKEN;

    const { machineToken } = await import("./client.js");

    expect(machineToken).toBe("");
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
