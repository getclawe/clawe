import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolvePlugin } from "@/lib/plugins";
import { getAuthenticatedTenant } from "@/lib/api/tenant-auth";

/**
 * POST /api/tenant/squadhub/restart
 *
 * Restart the current user's squadhub service.
 * Dev: no-op. Cloud: forces new ECS task deployment.
 */
export const POST = async (request: NextRequest) => {
  const { error, tenant } = await getAuthenticatedTenant(request);
  if (error) return error;

  try {
    const lifecycle = await resolvePlugin("squadhub-lifecycle");
    await lifecycle.restart(tenant._id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
