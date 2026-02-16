import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/verify-token";

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "nextauth";

const PUBLIC_PATHS = ["/auth/login", "/api/auth", "/api/health"];

function extractToken(request: NextRequest): string | null {
  if (AUTH_PROVIDER === "nextauth") {
    const cookie =
      request.cookies.get("authjs.session-token") ??
      request.cookies.get("__Secure-authjs.session-token");
    return cookie?.value ?? null;
  }

  // Cognito: token is in the Authorization header (API routes only).
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

function unauthorized(message: string) {
  return new NextResponse(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Cognito page navigations carry no token — client-side useAuth guards those.
  const isApiRoute = pathname.startsWith("/api/");
  if (AUTH_PROVIDER === "cognito" && !isApiRoute) {
    return NextResponse.next();
  }

  const token = extractToken(request);

  if (!token) {
    return isApiRoute
      ? unauthorized("Unauthorized")
      : NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return isApiRoute
      ? unauthorized("Invalid token")
      : NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
