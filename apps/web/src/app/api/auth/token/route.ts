import type { NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const cookieName =
    request.nextUrl.protocol === "https:"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";
  const token = request.cookies.get(cookieName)?.value ?? null;

  return Response.json({ token });
}
