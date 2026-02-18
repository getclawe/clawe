import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkHealth } from "@clawe/shared/squadhub";
import { getAuthenticatedTenant } from "@/lib/api/tenant-auth";
import { getConnection } from "@/lib/squadhub/connection";

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedTenant(request);
  if (auth.error) return auth.error;

  const result = await checkHealth(getConnection(auth.tenant));
  return NextResponse.json(result);
}
