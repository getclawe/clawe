import { NextRequest, NextResponse } from "next/server";
import { getSharedClient } from "@clawe/shared/squadhub";
import { getConnection } from "@/lib/squadhub/connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AbortRequestBody = {
  sessionKey: string;
  runId?: string;
};

/**
 * POST /api/chat/abort
 * Abort an in-progress chat generation.
 */
export async function POST(request: NextRequest) {
  let body: AbortRequestBody;

  try {
    body = (await request.json()) as AbortRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sessionKey, runId } = body;

  if (!sessionKey || typeof sessionKey !== "string") {
    return NextResponse.json(
      { error: "sessionKey is required" },
      { status: 400 },
    );
  }

  try {
    const client = await getSharedClient(getConnection());

    await client.request("chat.abort", {
      sessionKey,
      ...(runId && { runId }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
