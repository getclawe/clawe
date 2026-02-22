interface ClaweConfig {
  convexUrl: string;
}

declare global {
  interface Window {
    __CLAWE_CONFIG__?: ClaweConfig;
  }
}

export function getConvexUrl(): string {
  // Server-side: read env directly
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "";
  }

  // Client-side: read from injected script tag, fall back to build-time env
  return (
    window.__CLAWE_CONFIG__?.convexUrl ||
    process.env.NEXT_PUBLIC_CONVEX_URL ||
    ""
  );
}
