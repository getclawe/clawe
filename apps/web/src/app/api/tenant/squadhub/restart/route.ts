import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { loadPlugins, getPlugin } from "@clawe/plugins";
import { getAuthenticatedTenant } from "@/lib/api/tenant-auth";

/**
 * POST /api/tenant/squadhub/restart
 *
 * Restart the current user's squadhub service.
 * Dev: no-op. Cloud: forces new ECS task deployment.
 */
export const POST = async (request: NextRequest) => {
  const result = await getAuthenticatedTenant(request);
  if ("error" in result) return result.error;

  const { tenant } = result;

  try {
    await loadPlugins();
    const lifecycle = getPlugin("squadhub-lifecycle");
    await lifecycle.restart(tenant._id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
