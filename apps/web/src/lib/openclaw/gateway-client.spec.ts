import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GatewayClient, createGatewayClient } from "./gateway-client";

// Mock ws module
vi.mock("ws", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1, // WebSocket.OPEN
    })),
  };
});

describe("GatewayClient", () => {
  let client: GatewayClient;

  beforeEach(() => {
    client = new GatewayClient({
      url: "http://localhost:18789",
      token: "test-token",
    });
  });

  afterEach(() => {
    client.close();
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("creates a client with provided options", () => {
      expect(client).toBeInstanceOf(GatewayClient);
    });
  });

  describe("isConnected", () => {
    it("returns false when not connected", () => {
      expect(client.isConnected()).toBe(false);
    });
  });

  describe("close", () => {
    it("closes without error when not connected", () => {
      expect(() => client.close()).not.toThrow();
    });
  });

  describe("request", () => {
    it("throws when not connected", async () => {
      await expect(client.request("test.method")).rejects.toThrow(
        "Gateway not connected",
      );
    });
  });
});

describe("createGatewayClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("creates client with default URL when env not set", () => {
    delete process.env.OPENCLAW_URL;
    delete process.env.OPENCLAW_TOKEN;

    const client = createGatewayClient();
    expect(client).toBeInstanceOf(GatewayClient);
    client.close();
  });

  it("creates client with env URL and token", () => {
    process.env.OPENCLAW_URL = "http://custom:8080";
    process.env.OPENCLAW_TOKEN = "custom-token";

    const client = createGatewayClient();
    expect(client).toBeInstanceOf(GatewayClient);
    client.close();
  });

  it("merges custom options with env config", () => {
    const onEvent = vi.fn();
    const client = createGatewayClient({ onEvent });
    expect(client).toBeInstanceOf(GatewayClient);
    client.close();
  });
});
