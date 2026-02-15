import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

// Mock the shared client
const mockRequest = vi.fn();

vi.mock("@clawe/shared/squadhub", () => ({
  getSharedClient: vi.fn(async () => ({
    request: mockRequest,
    isConnected: vi.fn().mockReturnValue(true),
  })),
}));

describe("GET /api/chat/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockResolvedValue({
      messages: [
        { role: "user", content: [{ type: "text", text: "Hello" }] },
        { role: "assistant", content: [{ type: "text", text: "Hi there!" }] },
      ],
      thinkingLevel: "normal",
    });
  });

  it("returns 400 when sessionKey is missing", async () => {
    const request = new NextRequest("http://localhost/api/chat/history");

    const response = await GET(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("sessionKey query parameter is required");
  });

  it("returns messages for valid sessionKey", async () => {
    const request = new NextRequest(
      "http://localhost/api/chat/history?sessionKey=test-session",
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.messages).toHaveLength(2);
    expect(data.thinkingLevel).toBe("normal");
  });

  it("uses custom limit when provided", async () => {
    const request = new NextRequest(
      "http://localhost/api/chat/history?sessionKey=test-session&limit=50",
    );

    await GET(request);

    expect(mockRequest).toHaveBeenCalledWith("chat.history", {
      sessionKey: "test-session",
      limit: 50,
    });
  });

  it("returns 400 for invalid limit", async () => {
    const request = new NextRequest(
      "http://localhost/api/chat/history?sessionKey=test-session&limit=9999",
    );

    const response = await GET(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("limit must be between 1 and 1000");
  });

  it("returns 500 on gateway error", async () => {
    mockRequest.mockRejectedValue(new Error("Request failed"));

    const request = new NextRequest(
      "http://localhost/api/chat/history?sessionKey=test-session",
    );

    const response = await GET(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Request failed");
  });

  it("returns 500 when getSharedClient fails", async () => {
    const { getSharedClient } = await import("@clawe/shared/squadhub");
    vi.mocked(getSharedClient).mockRejectedValueOnce(
      new Error("Connection failed"),
    );

    const request = new NextRequest(
      "http://localhost/api/chat/history?sessionKey=test-session",
    );

    const response = await GET(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Connection failed");
  });
});
