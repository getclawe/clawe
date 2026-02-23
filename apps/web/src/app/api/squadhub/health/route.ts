import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkHealth } from "@clawe/shared/squadhub";
import { resolvePlugin } from "@/lib/plugins";
import { getAuthenticatedTenant } from "@/lib/api/tenant-auth";
import { getConnection } from "@/lib/squadhub/connection";
import { config } from "@/lib/config";

// Track when each tenant's gateway was last known healthy.
// During a restart the process is briefly down (ECONNREFUSED), making
// an HTTP probe indistinguishable from a real outage. This lets us
// infer "restarting" when the gateway was healthy moments ago.
const lastHealthyAt = new Map<string, number>();
const RESTART_GRACE_MS = 30_000;

async function isInfraRunning(
  tenantId: string,
  squadhubUrl: string,
): Promise<boolean> {
  try {
    if (config.isCloud) {
      const lifecycle = await resolvePlugin("squadhub-lifecycle");
      const status = await lifecycle.getStatus(tenantId);
      return status.running;
    }

    // Dev/OSS: HTTP probe — any response means the process is alive
    await fetch(squadhubUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
    });
    return true;
  } catch {
    // Probe failed (ECONNREFUSED). Check if gateway was recently healthy —
    // during a restart the process is briefly down but should come back.
    const lastHealthy = lastHealthyAt.get(tenantId);
    if (lastHealthy && Date.now() - lastHealthy < RESTART_GRACE_MS) {
      return true;
    }
    return false;
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedTenant(request);
  if (auth.error) return auth.error;

  const connection = getConnection(auth.tenant);
  const result = await checkHealth(connection);

  if (result.ok) {
    lastHealthyAt.set(auth.tenant._id, Date.now());
    return NextResponse.json(result);
  }

  const restarting = await isInfraRunning(
    auth.tenant._id,
    connection.squadhubUrl,
  );
  return NextResponse.json({ ...result, restarting });
}
