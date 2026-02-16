"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Amplify } from "aws-amplify";
import {
  getCurrentUser,
  fetchUserAttributes,
  signInWithRedirect,
  signOut as amplifySignOut,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { fetchAuthToken } from "@/lib/api/client";

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "nextauth";

interface AuthUser {
  email: string;
  name?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  signIn: (email?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// NextAuth provider (local / self-hosted)
// ---------------------------------------------------------------------------

const NextAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) {
          setIsLoading(false);
          return;
        }
        const session = await res.json();
        if (session?.user?.email) {
          setUser({
            email: session.user.email,
            name: session.user.name ?? undefined,
          });
          setIsAuthenticated(true);
        }
      } catch {
        // Session check failed — not authenticated
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const signIn = useCallback(async (email?: string) => {
    const { signIn: nextAuthSignIn } = await import("next-auth/react");
    if (email) {
      // Credentials auto-login (for local dev with AUTO_LOGIN_EMAIL)
      const result = await nextAuthSignIn("credentials", {
        redirect: false,
        email,
      });
      if (result?.ok) {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const session = await res.json();
          if (session?.user?.email) {
            setUser({
              email: session.user.email,
              name: session.user.name ?? undefined,
            });
            setIsAuthenticated(true);
          }
        }
      }
    } else {
      // Google OAuth (redirect-based flow)
      await nextAuthSignIn("google");
    }
  }, []);

  const signOut = useCallback(async () => {
    const { signOut: nextAuthSignOut } = await import("next-auth/react");
    await nextAuthSignOut({ redirect: false });
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, user, signIn, signOut }),
    [isAuthenticated, isLoading, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ---------------------------------------------------------------------------
// Cognito provider (cloud)
// ---------------------------------------------------------------------------

const CognitoProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const checkAuthState = useCallback(async () => {
    try {
      await getCurrentUser();
      const attributes = await fetchUserAttributes();
      setUser({
        email: attributes.email ?? "",
        name: attributes.name,
      });
      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
          userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
          loginWith: {
            oauth: {
              domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!,
              scopes: ["openid", "email", "profile"],
              redirectSignIn: [window.location.origin],
              redirectSignOut: [window.location.origin],
              responseType: "code",
            },
          },
        },
      },
    });

    Hub.listen("auth", ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
        case "signInWithRedirect":
          checkAuthState();
          break;
        case "signedOut":
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          break;
      }
    });

    checkAuthState();
  }, [checkAuthState]);

  const signIn = useCallback(async () => {
    await signInWithRedirect({ provider: "Google" });
  }, []);

  const signOut = useCallback(async () => {
    await amplifySignOut();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, user, signIn, signOut }),
    [isAuthenticated, isLoading, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ---------------------------------------------------------------------------
// Exported provider — selects based on AUTH_PROVIDER env var
// ---------------------------------------------------------------------------

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  if (AUTH_PROVIDER === "cognito") {
    return <CognitoProvider>{children}</CognitoProvider>;
  }
  return <NextAuthProvider>{children}</NextAuthProvider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Hook for ConvexProviderWithAuth.
 * Returns { isLoading, isAuthenticated, fetchAccessToken }.
 */
export const useConvexAuth = () => {
  const { isLoading, isAuthenticated } = useAuth();

  const fetchAccessToken: (args: {
    forceRefreshToken: boolean;
  }) => Promise<string | null> = useCallback(async () => {
    if (!isAuthenticated) return null;
    return fetchAuthToken();
  }, [isAuthenticated]);

  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken],
  );
};
