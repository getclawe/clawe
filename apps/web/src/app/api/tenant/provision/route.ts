import { NextResponse } from "next/server";
import { provisionTenant } from "@/lib/squadhub/provision";
import { getConnection } from "@/lib/squadhub/connection";

/**
 * POST /api/tenant/provision
 *
 * Runs tenant setup: registers default agents, configures heartbeat crons,
 * and seeds initial routines. Idempotent — safe to call multiple times.
 *
 * In Phase 7 this will also handle AWS infrastructure (ECS, EFS, CloudMap).
 * For now it only runs the application-level setup.
 */
export async function POST() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CONVEX_URL not configured" },
      { status: 500 },
    );
  }

  try {
    const result = await provisionTenant(getConnection(), convexUrl);

    return NextResponse.json({
      ok: result.errors.length === 0,
      agents: result.agents,
      crons: result.crons,
      routines: result.routines,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
