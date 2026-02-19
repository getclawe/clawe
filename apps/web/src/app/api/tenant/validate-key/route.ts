import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * POST /api/tenant/validate-key
 *
 * Basic format validation for API keys.
 * Accepts both standard API keys and subscription tokens.
 */
export const POST = async (request: NextRequest) => {
  try {
    const body = (await request.json()) as {
      provider: string;
      apiKey: string;
    };

    const { provider, apiKey } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { valid: false, error: "Missing provider or apiKey" },
        { status: 400 },
      );
    }

    if (provider === "anthropic") {
      const trimmed = apiKey.trim();
      if (trimmed.length < 10) {
        return NextResponse.json({
          valid: false,
          error: "Key is too short",
        });
      }
      return NextResponse.json({ valid: true });
    }

    if (provider === "openai") {
      const trimmed = apiKey.trim();
      if (!trimmed.startsWith("sk-")) {
        return NextResponse.json({
          valid: false,
          error: "OpenAI keys start with sk-",
        });
      }
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json(
      { valid: false, error: `Unknown provider: ${provider}` },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
};
