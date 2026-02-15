"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@clawe/backend";

/**
 * Redirects to /setup if onboarding is not complete.
 * Use in dashboard/protected routes.
 */
export const useRequireOnboarding = () => {
  const router = useRouter();
  const isComplete = useQuery(api.tenants.isOnboardingComplete, {});

  useEffect(() => {
    if (isComplete === false) {
      router.replace("/setup");
    }
  }, [isComplete, router]);

  return { isLoading: isComplete === undefined, isComplete };
};

/**
 * Redirects to /board if onboarding is already complete.
 * Use in setup routes.
 */
export const useRedirectIfOnboarded = () => {
  const router = useRouter();
  const isComplete = useQuery(api.tenants.isOnboardingComplete, {});

  useEffect(() => {
    if (isComplete === true) {
      router.replace("/board");
    }
  }, [isComplete, router]);

  return { isLoading: isComplete === undefined, isComplete };
};
