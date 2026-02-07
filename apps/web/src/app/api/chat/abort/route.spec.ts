import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock the gateway client
const mockRequest = vi.fn();
const mockConnect = vi.fn();
const mockClose = vi.fn();

vi.mock("@/lib/openclaw/gateway-client", () => ({
  createGatewayClient: vi.fn(() => ({
    connect: mockConnect,
    request: mockRequest,
    close: mockClose,
    isConnected: vi.fn().mockReturnValue(true),
  })),
}));

describe("POST /api/chat/abort", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue({ type: "hello-ok", protocol: 3 });
    mockRequest.mockResolvedValue({});
  });

  it("returns 400 when sessionKey is missing", async () => {
    const request = new NextRequest("http://localhost/api/chat/abort", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("sessionKey is required");
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new NextRequest("http://localhost/api/chat/abort", {
      method: "POST",
      body: "invalid json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Invalid JSON body");
  });

  it("aborts without runId", async () => {
    const request = new NextRequest("http://localhost/api/chat/abort", {
      method: "POST",
      body: JSON.stringify({ sessionKey: "test-session" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);

    expect(mockRequest).toHaveBeenCalledWith("chat.abort", {
      sessionKey: "test-session",
    });
  });

  it("aborts with runId", async () => {
    const request = new NextRequest("http://localhost/api/chat/abort", {
      method: "POST",
      body: JSON.stringify({
        sessionKey: "test-session",
        runId: "run-123",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(mockRequest).toHaveBeenCalledWith("chat.abort", {
      sessionKey: "test-session",
      runId: "run-123",
    });
  });

  it("returns 500 on gateway error", async () => {
    mockRequest.mockRejectedValue(new Error("Abort failed"));

    const request = new NextRequest("http://localhost/api/chat/abort", {
      method: "POST",
      body: JSON.stringify({ sessionKey: "test-session" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Abort failed");
  });

  it("closes client after request", async () => {
    const request = new NextRequest("http://localhost/api/chat/abort", {
      method: "POST",
      body: JSON.stringify({ sessionKey: "test-session" }),
    });

    await POST(request);

    expect(mockClose).toHaveBeenCalled();
  });
});
