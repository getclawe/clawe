import { NextResponse } from "next/server";
import {
  listChannelPairingRequests,
  approveChannelPairingCode,
} from "@clawe/shared/squadhub";
import { getConnection } from "@/lib/squadhub/connection";

// GET /api/squadhub/pairing?channel=telegram - List pending pairing requests
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "telegram";

  const result = await listChannelPairingRequests(channel);

  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(result.result);
}

// POST /api/squadhub/pairing - Approve a pairing code
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { channel = "telegram", code } = body as {
      channel?: string;
      code: string;
    };

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const result = await approveChannelPairingCode(
      getConnection(),
      channel,
      code,
    );

    if (!result.ok) {
      const status = result.error.type === "not_found" ? 404 : 500;
      return NextResponse.json({ error: result.error.message }, { status });
    }

    return NextResponse.json(result.result);
  } catch {
    return NextResponse.json(
      { error: "Failed to approve pairing code" },
      { status: 500 },
    );
  }
}
