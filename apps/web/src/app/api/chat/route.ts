import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getConnection } from "@/lib/squadhub/connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/chat
 * Proxy chat requests to the squadhub's OpenAI-compatible endpoint.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, sessionKey } = body;

    if (!sessionKey || typeof sessionKey !== "string") {
      return new Response(JSON.stringify({ error: "sessionKey is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { squadhubUrl, squadhubToken } = getConnection();

    // Create OpenAI-compatible client pointing to squadhub gateway
    const squadhub = createOpenAI({
      baseURL: `${squadhubUrl}/v1`,
      apiKey: squadhubToken,
    });

    // Stream response using Vercel AI SDK
    // Use .chat() to force Chat Completions API instead of Responses API
    const result = streamText({
      model: squadhub.chat("openclaw"),
      messages,
      headers: {
        "X-OpenClaw-Session-Key": sessionKey,
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[chat] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
