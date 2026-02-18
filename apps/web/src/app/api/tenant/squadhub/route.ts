import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { loadPlugins, getPlugin } from "@clawe/plugins";
import { getAuthenticatedTenant } from "@/lib/api/tenant-auth";

/**
 * DELETE /api/tenant/squadhub
 *
 * Destroy the current user's squadhub service permanently.
 * Dev: no-op. Cloud: deletes ECS service + EFS access point + CloudMap entry.
 */
export const DELETE = async (request: NextRequest) => {
  const result = await getAuthenticatedTenant(request);
  if ("error" in result) return result.error;

  const { tenant } = result;

  try {
    await loadPlugins();
    const lifecycle = getPlugin("squadhub-lifecycle");
    await lifecycle.destroy(tenant._id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
