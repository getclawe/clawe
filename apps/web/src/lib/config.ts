import { getConvexUrl } from "@/lib/runtime-config";

export const config = {
  isCloud: process.env.NEXT_PUBLIC_CLAWE_EDITION === "cloud",
  authProvider: (process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "nextauth") as
    | "nextauth"
    | "cognito",
  get convexUrl() {
    return getConvexUrl();
  },
} as const;
