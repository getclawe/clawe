"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useConvexAuth } from "@/providers/auth-provider";

// Fallback URL for build time - won't be called during static generation
const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || "http://localhost:0",
);

export const ConvexClientProvider = ({ children }: { children: ReactNode }) => (
  <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
    {children}
  </ConvexProviderWithAuth>
);
