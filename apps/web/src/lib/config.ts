export const config = {
  isCloud: process.env.NEXT_PUBLIC_CLAWE_EDITION === "cloud",
  authProvider: (process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "nextauth") as
    | "nextauth"
    | "cognito",
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
} as const;
