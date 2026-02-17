"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@clawe/backend";
import { useAuth } from "@/providers/auth-provider";

/**
 * Redirects to /setup/provisioning if no active tenant.
 * Redirects to /setup if onboarding is not complete.
 * Redirects to /auth/login if not authenticated.
 * Use in dashboard/protected routes.
 */
export const useRequireOnboarding = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const tenant = useQuery(
    api.tenants.getForCurrentUser,
    isAuthenticated ? {} : "skip",
  );

  const tenantActive = tenant?.status === "active";

  const isComplete = useQuery(
    api.accounts.isOnboardingComplete,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    // Still loading tenant
    if (!isAuthenticated || tenant === undefined) return;

    // No tenant or not active → provisioning
    if (tenant === null || !tenantActive) {
      router.replace("/setup/provisioning");
      return;
    }

    // Tenant active but not onboarded → setup
    if (isComplete === false) {
      router.replace("/setup");
    }
  }, [isComplete, isAuthenticated, authLoading, tenant, tenantActive, router]);

  return {
    isLoading:
      authLoading ||
      tenant === undefined ||
      (isAuthenticated && isComplete === undefined),
    isComplete,
  };
};

/**
 * Redirects to /setup/provisioning if no active tenant (unless already there).
 * Redirects to /board if onboarding is already complete.
 * Redirects to /auth/login if not authenticated.
 * Use in setup routes.
 */
export const useRedirectIfOnboarded = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const tenant = useQuery(
    api.tenants.getForCurrentUser,
    isAuthenticated ? {} : "skip",
  );

  const tenantActive = tenant?.status === "active";

  const isComplete = useQuery(
    api.accounts.isOnboardingComplete,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    // Still loading tenant
    if (!isAuthenticated || tenant === undefined) return;

    // No tenant or not active → provisioning (avoid redirect loop)
    if (
      (tenant === null || !tenantActive) &&
      pathname !== "/setup/provisioning"
    ) {
      router.replace("/setup/provisioning");
      return;
    }

    // Tenant active and onboarded → dashboard
    if (isComplete === true) {
      router.replace("/board");
    }
  }, [
    isComplete,
    isAuthenticated,
    authLoading,
    tenant,
    tenantActive,
    pathname,
    router,
  ]);

  return {
    isLoading:
      authLoading ||
      tenant === undefined ||
      (isAuthenticated && isComplete === undefined),
    isComplete,
  };
};
