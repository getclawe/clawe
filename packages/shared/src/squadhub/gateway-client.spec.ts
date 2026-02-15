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

const connection = {
  squadhubUrl: "http://localhost:18789",
  squadhubToken: "test-token",
};

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
  it("creates client with connection params", () => {
    const client = createGatewayClient(connection);
    expect(client).toBeInstanceOf(GatewayClient);
    client.close();
  });

  it("merges custom options with connection", () => {
    const onEvent = vi.fn();
    const client = createGatewayClient(connection, { onEvent });
    expect(client).toBeInstanceOf(GatewayClient);
    client.close();
  });
});
