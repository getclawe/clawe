import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@clawe/backend";
import { loadPlugins, getPlugin } from "@clawe/plugins";
import { setupTenant } from "@/lib/squadhub/setup";

/**
 * POST /api/tenant/provision
 *
 * Authenticated route that ensures the current user has a provisioned tenant.
 * Idempotent — safe to call multiple times.
 *
 * Requires an Authorization header with the Convex JWT (works for both
 * NextAuth and Cognito — the client auth provider supplies the token).
 *
 * Flow:
 * 1. Read JWT from Authorization header
 * 2. Ensure account exists (accounts.getOrCreateForUser)
 * 3. Check for existing tenant (tenants.getForCurrentUser)
 * 4. If no active tenant: create tenant, provision via plugin, update status
 * 5. Run app-level setup (agents, crons, routines)
 * 6. Return { ok: true, tenantId }
 */
export const POST = async (request: NextRequest) => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CONVEX_URL not configured" },
      { status: 500 },
    );
  }

  // 1. Read JWT from Authorization header
  const authHeader = request.headers.get("authorization");
  const authToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!authToken) {
    return NextResponse.json(
      { error: "Missing Authorization header" },
      { status: 401 },
    );
  }

  // Create authenticated Convex client
  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(authToken);

  try {
    // 2. Ensure account exists
    const account = await convex.mutation(api.accounts.getOrCreateForUser, {});

    // 3. Check for existing tenant
    const existingTenant = await convex.query(
      api.tenants.getForCurrentUser,
      {},
    );

    if (existingTenant && existingTenant.status === "active") {
      // Tenant already provisioned — just re-run app setup below
    } else {
      // 4. Create tenant + provision via plugin
      await loadPlugins();
      const provisioner = getPlugin("squadhub-provisioner");

      // Create tenant record (or use existing non-active one)
      const tenantIdToProvision = existingTenant
        ? existingTenant._id
        : await convex.mutation(api.tenants.create, {});

      // Provision infrastructure (dev: reads env vars)
      const provisionResult = await provisioner.provision({
        tenantId: tenantIdToProvision,
        accountId: account._id,
        convexUrl,
      });

      // Update tenant with connection details
      await convex.mutation(api.tenants.updateStatus, {
        status: "active",
        squadhubUrl: provisionResult.squadhubUrl,
        squadhubToken: provisionResult.squadhubToken,
        ...(provisionResult.metadata?.squadhubServiceArn && {
          squadhubServiceArn: provisionResult.metadata.squadhubServiceArn,
        }),
        ...(provisionResult.metadata?.efsAccessPointId && {
          efsAccessPointId: provisionResult.metadata.efsAccessPointId,
        }),
      });
    }

    // Re-fetch tenant to get latest connection details
    const tenant = await convex.query(api.tenants.getForCurrentUser, {});

    if (!tenant) {
      return NextResponse.json(
        { error: "Failed to retrieve tenant after provisioning" },
        { status: 500 },
      );
    } else if (tenant.status !== "active") {
      return NextResponse.json(
        { error: `Tenant in unexpected status "${tenant.status}"` },
        { status: 500 },
      );
    } else if (!tenant.squadhubUrl || !tenant.squadhubToken) {
      return NextResponse.json(
        { error: "Tenant missing Squadhub connection details" },
        { status: 500 },
      );
    }

    // 5. Run app-level setup (agents, crons, routines)
    const connection = {
      squadhubUrl: tenant.squadhubUrl,
      squadhubToken: tenant.squadhubToken,
    };

    const result = await setupTenant(connection, convexUrl, authToken);

    // 6. Return result
    return NextResponse.json({
      ok: result.errors.length === 0,
      tenantId: tenant._id,
      agents: result.agents,
      crons: result.crons,
      routines: result.routines,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
