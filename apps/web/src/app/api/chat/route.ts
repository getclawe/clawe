import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const agencyUrl = process.env.AGENCY_URL || "http://localhost:18789";
const agencyToken = process.env.AGENCY_TOKEN || "";

/**
 * POST /api/chat
 * Proxy chat requests to the agency's OpenAI-compatible endpoint.
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

    // Create OpenAI-compatible client pointing to agency gateway
    const agency = createOpenAI({
      baseURL: `${agencyUrl}/v1`,
      apiKey: agencyToken,
    });

    // Stream response using Vercel AI SDK
    // Use .chat() to force Chat Completions API instead of Responses API
    const result = streamText({
      model: agency.chat("openclaw"),
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
