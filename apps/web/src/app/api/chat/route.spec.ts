import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock the gateway client
vi.mock("@/lib/openclaw/gateway-client", () => ({
  createGatewayClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue({ type: "hello-ok", protocol: 3 }),
    request: vi.fn().mockResolvedValue({}),
    close: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
  })),
}));

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when sessionKey is missing", async () => {
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Hello" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("sessionKey is required");
  });

  it("returns SSE stream with correct headers", async () => {
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        sessionKey: "test-session",
        message: "Hello",
      }),
    });

    const response = await POST(request);

    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
    expect(response.headers.get("Connection")).toBe("keep-alive");
  });

  it("handles attachments in request body", async () => {
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        sessionKey: "test-session",
        message: "Check this image",
        attachments: [
          {
            type: "image",
            mimeType: "image/png",
            content: "base64data",
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("returns 500 on invalid JSON", async () => {
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: "invalid json",
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
