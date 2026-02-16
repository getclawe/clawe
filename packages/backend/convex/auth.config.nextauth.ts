import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      type: "customJwt",
      issuer: process.env.NEXTAUTH_ISSUER_URL!,
      jwks: process.env.NEXTAUTH_JWKS_URL!,
      applicationID: "convex",
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
