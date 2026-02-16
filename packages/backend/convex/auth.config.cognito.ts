import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.COGNITO_ISSUER_URL!,
      applicationID: process.env.COGNITO_CLIENT_ID!,
    },
  ],
} satisfies AuthConfig;
