import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolvePlugin } from "@/lib/plugins";
import { getAuthenticatedTenant } from "@/lib/api/tenant-auth";

/**
 * GET /api/tenant/squadhub/status
 *
 * Check the health/status of the current user's squadhub service.
 * Dev: always returns { running: true, healthy: true }.
 * Cloud: checks ECS service running count + task health.
 */
export const GET = async (request: NextRequest) => {
  const { error, tenant } = await getAuthenticatedTenant(request);
  if (error) return error;

  try {
    const lifecycle = await resolvePlugin("squadhub-lifecycle");
    const status = await lifecycle.getStatus(tenant._id);

    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
