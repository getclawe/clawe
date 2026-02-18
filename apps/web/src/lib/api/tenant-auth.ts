import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@clawe/backend";

/**
 * Extract the auth token and resolve the tenant for the current user.
 * Returns a Convex client (with auth set) and the tenant record,
 * or a NextResponse error if auth/tenant resolution fails.
 */
export async function getAuthenticatedTenant(request: NextRequest) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return {
      error: NextResponse.json(
        { error: "NEXT_PUBLIC_CONVEX_URL not configured" },
        { status: 500 },
      ),
    };
  }

  const authHeader = request.headers.get("authorization");
  const authToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!authToken) {
    return {
      error: NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 },
      ),
    };
  }

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(authToken);

  const tenant = await convex.query(api.tenants.getForCurrentUser, {});

  if (!tenant) {
    return {
      error: NextResponse.json(
        { error: "No tenant found for current user" },
        { status: 404 },
      ),
    };
  }

  return { convex, tenant };
}
