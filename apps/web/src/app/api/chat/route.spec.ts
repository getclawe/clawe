import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockTenantAuth } from "@/test/mock-tenant-auth";
import { POST } from "./route";

vi.mock("@/lib/api/tenant-auth", () => mockTenantAuth);

// Mock the AI SDK
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => ({
    chat: vi.fn(() => ({ modelId: "openclaw" })),
  })),
}));

vi.mock("ai", () => ({
  streamText: vi.fn(() => ({
    toTextStreamResponse: vi.fn(
      () =>
        new Response("Hello", {
          headers: { "Content-Type": "text/plain" },
        }),
    ),
  })),
}));

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when sessionKey is missing", async () => {
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("sessionKey is required");
  });

  it("returns 400 when messages is missing", async () => {
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ sessionKey: "test-session" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("messages is required");
  });

  it("returns stream response with valid request", async () => {
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        sessionKey: "test-session",
        messages: [{ role: "user", content: "Hello" }],
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
