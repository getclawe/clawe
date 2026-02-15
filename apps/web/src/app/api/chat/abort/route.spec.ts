import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock the shared client
const mockRequest = vi.fn();

vi.mock("@clawe/shared/squadhub", () => ({
  getSharedClient: vi.fn(async () => ({
    request: mockRequest,
    isConnected: vi.fn().mockReturnValue(true),
  })),
}));

describe("POST /api/chat/abort", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("returns 500 when getSharedClient fails", async () => {
    const { getSharedClient } = await import("@clawe/shared/squadhub");
    vi.mocked(getSharedClient).mockRejectedValueOnce(
      new Error("Connection failed"),
    );

    const request = new NextRequest("http://localhost/api/chat/abort", {
      method: "POST",
      body: JSON.stringify({ sessionKey: "test-session" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Connection failed");
  });
});
