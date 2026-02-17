import NextAuth from "next-auth";
import type { NextAuthResult } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { importPKCS8, importSPKI, SignJWT, jwtVerify } from "jose";
import fs from "node:fs";
import path from "node:path";

const DEV_JWKS_DIR = path.resolve(
  process.cwd(),
  "../../packages/backend/convex/dev-jwks",
);
const privatePem = fs.readFileSync(
  path.join(DEV_JWKS_DIR, "private.pem"),
  "utf8",
);
const publicPem = fs.readFileSync(
  path.join(DEV_JWKS_DIR, "public.pem"),
  "utf8",
);

// Cache parsed keys to avoid re-importing on every encode/decode
let privateKeyCache: Awaited<ReturnType<typeof importPKCS8>> | undefined;
let publicKeyCache: Awaited<ReturnType<typeof importSPKI>> | undefined;

const getPrivateKey = async () => {
  privateKeyCache ??= await importPKCS8(privatePem, "RS256");
  return privateKeyCache;
};
const getPublicKey = async () => {
  publicKeyCache ??= await importSPKI(publicPem, "RS256");
  return publicKeyCache;
};

const ISSUER = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const AUDIENCE = "convex";

const providers: Provider[] = [Google];

if (process.env.AUTO_LOGIN_EMAIL) {
  providers.push(
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
      },
      authorize: async (credentials) => {
        const email = String(credentials.email ?? "");
        if (!email) return null;
        return { id: email, email, name: email.split("@")[0] };
      },
    }),
  );
}

const nextAuth = NextAuth({
  providers,
  session: { strategy: "jwt" },
  jwt: {
    async encode({ token }) {
      if (!token) return "";
      const privateKey = await getPrivateKey();
      return new SignJWT({
        sub: String(token.email ?? ""),
        email: String(token.email ?? ""),
        name: String(token.name ?? ""),
      })
        .setProtectedHeader({ alg: "RS256", kid: "clawe-dev-key" })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(privateKey);
    },
    async decode({ token }) {
      if (!token) return null;
      const publicKey = await getPublicKey();
      const { payload } = await jwtVerify(token, publicKey, {
        issuer: ISSUER,
        audience: AUDIENCE,
      });
      return payload;
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (token.email) session.user.email = String(token.email);
      if (token.name) session.user.name = String(token.name);
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
});

export const handlers: NextAuthResult["handlers"] = nextAuth.handlers;
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn;
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut;
export const auth: NextAuthResult["auth"] = nextAuth.auth;
