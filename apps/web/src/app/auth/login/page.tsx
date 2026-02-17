"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@clawe/backend";
import { Button } from "@clawe/ui/components/button";
import { Spinner } from "@clawe/ui/components/spinner";
import { useAuth } from "@/providers/auth-provider";

const AUTO_LOGIN_EMAIL = process.env.NEXT_PUBLIC_AUTO_LOGIN_EMAIL;

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const getOrCreateUser = useMutation(api.users.getOrCreateFromAuth);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  // Auto-login when AUTO_LOGIN_EMAIL is set (local dev convenience)
  useEffect(() => {
    if (!AUTO_LOGIN_EMAIL) return;
    if (isLoading || isAuthenticated || autoLoginAttempted) return;
    setAutoLoginAttempted(true);
    signIn(AUTO_LOGIN_EMAIL);
  }, [isLoading, isAuthenticated, autoLoginAttempted, signIn]);

  // After authentication, create/fetch user and redirect
  useEffect(() => {
    if (!isAuthenticated) return;

    const ensureUser = async () => {
      try {
        await getOrCreateUser();
      } catch {
        // User creation may fail if auth isn't ready yet.
        // The root page handles routing on the next page load.
      }
      router.replace("/");
    };

    ensureUser();
  }, [isAuthenticated, getOrCreateUser, router]);

  return (
    <div className="relative flex h-svh">
      {/* Left side - Login content */}
      <div className="flex w-full flex-col px-6 py-6 sm:px-8 sm:py-8 lg:w-1/2 lg:px-12 xl:px-16">
        {/* Logo */}
        <div className="mb-8 shrink-0 sm:mb-12">
          <span
            className="text-xl font-semibold"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Clawe
          </span>
        </div>

        {/* Centered content */}
        <div className="flex flex-1 items-start justify-center pt-[20vh]">
          <div className="flex w-full max-w-sm flex-col items-center gap-8">
            {isLoading || isAuthenticated ? (
              <div className="flex flex-col items-center gap-4">
                <Spinner className="h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  {isAuthenticated ? "Signing you in..." : "Loading..."}
                </p>
              </div>
            ) : (
              <>
                <h1
                  className="text-2xl font-semibold tracking-tight sm:text-3xl"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  Welcome to Clawe
                </h1>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-2"
                  onClick={() => signIn()}
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Illustration */}
      <div className="bg-muted relative hidden lg:block lg:w-1/2">
        <div className="absolute inset-0 flex items-end justify-center p-12">
          <Image
            src="/onboarding-hero.png"
            alt="Clawe illustration"
            width={450}
            height={450}
            className="h-auto max-h-full w-auto max-w-full object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}

const GoogleIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="-3 0 262 262"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
      fill="#4285F4"
    />
    <path
      d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
      fill="#34A853"
    />
    <path
      d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
      fill="#FBBC05"
    />
    <path
      d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
      fill="#EB4335"
    />
  </svg>
);
