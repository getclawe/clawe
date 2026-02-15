import { NextRequest, NextResponse } from "next/server";
import { getSharedClient } from "@clawe/shared/squadhub";
import type { ChatHistoryResponse } from "@clawe/shared/squadhub";
import { getConnection } from "@/lib/squadhub/connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/chat/history?sessionKey=xxx&limit=200
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionKey = searchParams.get("sessionKey");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 200;

  if (!sessionKey) {
    return NextResponse.json(
      { error: "sessionKey query parameter is required" },
      { status: 400 },
    );
  }

  if (isNaN(limit) || limit < 1 || limit > 1000) {
    return NextResponse.json(
      { error: "limit must be between 1 and 1000" },
      { status: 400 },
    );
  }

  try {
    const client = await getSharedClient(getConnection());

    const response = await client.request<ChatHistoryResponse>("chat.history", {
      sessionKey,
      limit,
    });

    return NextResponse.json(
      {
        messages: response.messages ?? [],
        thinkingLevel: response.thinkingLevel ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
