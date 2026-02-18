import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  listPairingRequests,
  approvePairingCode,
  parseToolText,
} from "@clawe/shared/squadhub";
import { getAuthenticatedTenant } from "@/lib/api/tenant-auth";
import { getConnection } from "@/lib/squadhub/connection";

// GET /api/squadhub/pairing?channel=telegram - List pending pairing requests
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedTenant(request);
  if (auth.error) return auth.error;

  const channel = request.nextUrl.searchParams.get("channel") || "telegram";
  const result = await listPairingRequests(getConnection(auth.tenant), channel);

  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const data = parseToolText<{ requests?: unknown[] }>(result);
  return NextResponse.json({ requests: data?.requests ?? [] });
}

// POST /api/squadhub/pairing - Approve a pairing code
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedTenant(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { channel = "telegram", code } = body as {
      channel?: string;
      code: string;
    };

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const result = await approvePairingCode(
      getConnection(auth.tenant),
      channel,
      code,
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    const data = parseToolText<{
      ok: boolean;
      id?: string;
      approved?: boolean;
      error?: string;
    }>(result);

    if (!data?.ok) {
      return NextResponse.json(
        { error: data?.error || "Failed to approve pairing code" },
        { status: 404 },
      );
    }

    return NextResponse.json({ id: data.id, approved: data.approved });
  } catch {
    return NextResponse.json(
      { error: "Failed to approve pairing code" },
      { status: 500 },
    );
  }
}
