import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "nextauth";

export async function fetchAuthToken(): Promise<string | null> {
  if (AUTH_PROVIDER === "cognito") {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  }

  // NextAuth: JWT is in HttpOnly cookie, fetch via server endpoint
  try {
    const res = await fetch("/api/auth/token");
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

export function createApiClient() {
  const instance = axios.create();

  instance.interceptors.request.use(async (config) => {
    const token = await fetchAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return instance;
}
