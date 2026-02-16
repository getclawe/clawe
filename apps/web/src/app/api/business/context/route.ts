import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@clawe/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEnvConfig() {
  return {
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
    squadhubToken: process.env.SQUADHUB_TOKEN,
  };
}

/**
 * GET /api/business/context
 *
 * Returns the current business context.
 * Used by agents to understand what business they're working for.
 *
 * Requires: Authorization header with SQUADHUB_TOKEN
 */
export const GET = async (request: Request) => {
  const { convexUrl, squadhubToken } = getEnvConfig();

  // Validate token
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== squadhubToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!convexUrl) {
    return NextResponse.json(
      { error: "Convex URL not configured" },
      { status: 500 },
    );
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const context = await client.query(api.businessContext.get, {});

    if (!context) {
      return NextResponse.json(
        { error: "Business context not configured" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      url: context.url,
      name: context.name,
      description: context.description,
      favicon: context.favicon,
      metadata: context.metadata,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

/**
 * POST /api/business/context
 *
 * Saves or updates the business context.
 * Used by Clawe CLI during onboarding.
 *
 * Requires: Authorization header with SQUADHUB_TOKEN
 */
export const POST = async (request: Request) => {
  const { convexUrl, squadhubToken } = getEnvConfig();

  // Validate token
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== squadhubToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!convexUrl) {
    return NextResponse.json(
      { error: "Convex URL not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();

    if (!body.url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const client = new ConvexHttpClient(convexUrl);
    const id = await client.mutation(api.businessContext.save, {
      url: body.url,
      name: body.name,
      description: body.description,
      favicon: body.favicon,
      metadata: body.metadata,
    });

    return NextResponse.json({
      success: true,
      id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
