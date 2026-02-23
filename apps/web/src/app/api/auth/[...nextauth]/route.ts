import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

const notAvailable = () =>
  NextResponse.json({ error: "Not available" }, { status: 404 });

const isCognito = config.authProvider === "cognito";

export const GET = isCognito
  ? notAvailable
  : async (request: NextRequest) => {
      const { handlers } = await import("@/lib/auth/nextauth-config");
      return handlers.GET(request);
    };

export const POST = isCognito
  ? notAvailable
  : async (request: NextRequest) => {
      const { handlers } = await import("@/lib/auth/nextauth-config");
      return handlers.POST(request);
    };
