"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@clawe/backend";
import { useAuth } from "@/providers/auth-provider";

/**
 * Redirects to /setup if onboarding is not complete.
 * Redirects to /auth/login if not authenticated.
 * Use in dashboard/protected routes.
 */
export const useRequireOnboarding = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isComplete = useQuery(
    api.tenants.isOnboardingComplete,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    if (isComplete === false) {
      router.replace("/setup");
    }
  }, [isComplete, isAuthenticated, authLoading, router]);

  return {
    isLoading: isComplete === undefined || authLoading,
    isComplete,
  };
};

/**
 * Redirects to /board if onboarding is already complete.
 * Redirects to /auth/login if not authenticated.
 * Use in setup routes.
 */
export const useRedirectIfOnboarded = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isComplete = useQuery(
    api.tenants.isOnboardingComplete,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    if (isComplete === true) {
      router.replace("/board");
    }
  }, [isComplete, isAuthenticated, authLoading, router]);

  return {
    isLoading: isComplete === undefined || authLoading,
    isComplete,
  };
};
