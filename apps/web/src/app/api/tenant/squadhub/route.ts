import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolvePlugin } from "@/lib/plugins";
import { getAuthenticatedTenant } from "@/lib/api/tenant-auth";

/**
 * DELETE /api/tenant/squadhub
 *
 * Destroy the current user's squadhub service permanently.
 * Dev: no-op. Cloud: deletes ECS service + EFS access point + CloudMap entry.
 */
export const DELETE = async (request: NextRequest) => {
  const { error, tenant } = await getAuthenticatedTenant(request);
  if (error) return error;

  try {
    const lifecycle = await resolvePlugin("squadhub-lifecycle");
    await lifecycle.destroy(tenant._id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
