import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@clawe/backend";
import { resolvePlugin } from "@/lib/plugins";
import { setupTenant } from "@/lib/squadhub/setup";
import { patchApiKeys } from "@/lib/squadhub/actions";
import { logger as baseLogger } from "@/lib/logger";

const logger = baseLogger.child({ route: "tenant/provision" });

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
    logger.info("Ensuring account exists");
    const account = await convex.mutation(api.accounts.getOrCreateForUser, {});
    logger.info({ accountId: account._id }, "Account ready");

    // 3. Check for existing tenant
    const existingTenant = await convex.query(
      api.tenants.getForCurrentUser,
      {},
    );
    logger.info(
      {
        hasTenant: !!existingTenant,
        status: existingTenant?.status,
        tenantId: existingTenant?._id,
      },
      "Existing tenant check",
    );

    if (existingTenant && existingTenant.status === "active") {
      // Tenant already provisioned — just re-run app setup below
      logger.info("Tenant already active, skipping provisioning");
    } else {
      // 4. Create tenant + provision via plugin
      const provisioner = await resolvePlugin("squadhub-provisioner");

      // Create tenant record (or use existing non-active one)
      const tenantIdToProvision = existingTenant
        ? existingTenant._id
        : await convex.mutation(api.tenants.create, {});
      logger.info({ tenantId: tenantIdToProvision }, "Provisioning tenant");

      // Provision infrastructure (dev: reads env vars)
      const provisionResult = await provisioner.provision({
        tenantId: tenantIdToProvision,
        accountId: account._id,
        convexUrl,
      });
      logger.info(
        {
          squadhubUrl: provisionResult.squadhubUrl,
          hasToken: !!provisionResult.squadhubToken,
          metadata: provisionResult.metadata,
        },
        "Provision result",
      );

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
      logger.info("Tenant status updated to active");
    }

    // Re-fetch tenant to get latest connection details
    const tenant = await convex.query(api.tenants.getForCurrentUser, {});
    logger.info(
      {
        tenantId: tenant?._id,
        status: tenant?.status,
        hasSquadhubUrl: !!tenant?.squadhubUrl,
        hasSquadhubToken: !!tenant?.squadhubToken,
      },
      "Re-fetched tenant",
    );

    if (!tenant) {
      logger.error("Tenant not found after provisioning");
      return NextResponse.json(
        { error: "Failed to retrieve tenant after provisioning" },
        { status: 500 },
      );
    } else if (tenant.status !== "active") {
      logger.error({ status: tenant.status }, "Tenant in unexpected status");
      return NextResponse.json(
        { error: `Tenant in unexpected status "${tenant.status}"` },
        { status: 500 },
      );
    } else if (!tenant.squadhubUrl || !tenant.squadhubToken) {
      logger.error(
        {
          squadhubUrl: tenant.squadhubUrl ?? null,
          hasToken: !!tenant.squadhubToken,
        },
        "Tenant missing Squadhub connection details",
      );
      return NextResponse.json(
        { error: "Tenant missing Squadhub connection details" },
        { status: 500 },
      );
    }

    // 5. Patch API keys into squadhub config
    const connection = {
      squadhubUrl: tenant.squadhubUrl,
      squadhubToken: tenant.squadhubToken,
    };

    if (tenant.anthropicApiKey) {
      await patchApiKeys(
        tenant.anthropicApiKey,
        tenant.openaiApiKey ?? undefined,
        connection,
      );
      logger.info("API keys patched");
    }

    // 6. Run app-level setup (agents, crons, routines)
    logger.info("Running app-level setup");
    const result = await setupTenant(connection, convexUrl, authToken);
    logger.info(
      {
        agents: result.agents,
        crons: result.crons,
        routines: result.routines,
        errors: result.errors,
      },
      "Setup complete",
    );

    // 7. Return result
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
    logger.error({ err: error }, "Provision failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
