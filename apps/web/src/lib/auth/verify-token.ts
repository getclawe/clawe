import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { JWTPayload } from "jose";

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "nextauth";

export interface VerifiedToken extends JWTPayload {
  sub: string;
  email?: string;
}

function isVerifiedToken(
  payload: JWTPayload | Record<string, unknown>,
): payload is VerifiedToken {
  return typeof payload.sub === "string";
}

// ---------------------------------------------------------------------------
// Cognito: use the official AWS verifier (handles JWKS caching, kid rotation,
// token_use / client_id validation, and Cognito-specific claim checks).
// ---------------------------------------------------------------------------

let cognitoVerifier: ReturnType<typeof CognitoJwtVerifier.create>;

function getCognitoVerifier() {
  if (!cognitoVerifier) {
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
    if (!userPoolId || !clientId) {
      throw new Error(
        "NEXT_PUBLIC_COGNITO_USER_POOL_ID and NEXT_PUBLIC_COGNITO_CLIENT_ID are required",
      );
    }

    cognitoVerifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: "id",
      clientId,
    });
  }
  return cognitoVerifier;
}

async function verifyCognitoToken(
  token: string,
): Promise<VerifiedToken | null> {
  try {
    const payload = await getCognitoVerifier().verify(token);
    if (!isVerifiedToken(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// NextAuth: verify with jose against the local JWKS bundled in @clawe/backend.
// Dynamic imports keep jose + dev JWKS out of the cloud bundle.
// ---------------------------------------------------------------------------

let nextAuthVerify: typeof import("jose").jwtVerify;
let nextAuthKeySet: ReturnType<typeof import("jose").createLocalJWKSet>;

async function verifyNextAuthToken(
  token: string,
): Promise<VerifiedToken | null> {
  try {
    if (!nextAuthVerify) {
      const jose = await import("jose");
      const jwks = (await import("@clawe/backend/dev-jwks/jwks.json")).default;
      nextAuthVerify = jose.jwtVerify;
      nextAuthKeySet = jose.createLocalJWKSet(jwks);
    }

    const { payload } = await nextAuthVerify(token, nextAuthKeySet, {
      issuer: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      audience: "convex",
    });

    if (!isVerifiedToken(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Verify and decode a JWT.
 *
 * - NextAuth: verifies against the local JWKS (RS256, dev keys) using `jose`
 * - Cognito: verifies using `aws-jwt-verify` (JWKS caching, kid rotation,
 *   token_use / client_id validation)
 *
 * Returns the decoded payload on success, or `null` on any failure
 * (expired, bad signature, wrong issuer/audience, malformed, etc.).
 */
export async function verifyToken(
  token: string,
): Promise<VerifiedToken | null> {
  if (AUTH_PROVIDER === "cognito") {
    return verifyCognitoToken(token);
  }
  return verifyNextAuthToken(token);
}
