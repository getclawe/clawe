"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

// Fallback URL for build time - won't be called during static generation
const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || "http://localhost:0",
);

export const ConvexClientProvider = ({ children }: { children: ReactNode }) => {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
};
