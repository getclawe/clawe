import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolvePlugin } from "@/lib/plugins";
import { getAuthenticatedTenant } from "@/lib/api/tenant-auth";

/**
 * GET /api/tenant/status
 *
 * Check provisioning status for the current user's tenant.
 * Dev: always returns { status: "active" }.
 * Cloud: returns real ECS provisioning status.
 */
export const GET = async (request: NextRequest) => {
  const { error, tenant } = await getAuthenticatedTenant(request);
  if (error) return error;

  try {
    const provisioner = await resolvePlugin("squadhub-provisioner");
    const status = await provisioner.getProvisioningStatus(tenant._id);

    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
