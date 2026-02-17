"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@clawe/backend";
import { useAuth } from "@/providers/auth-provider";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const getOrCreateUser = useMutation(api.users.getOrCreateFromAuth);
  const [userReady, setUserReady] = useState(false);

  // Ensure user record exists before querying tenant data
  useEffect(() => {
    if (!isAuthenticated || userReady) return;
    getOrCreateUser()
      .then(() => setUserReady(true))
      .catch(() => setUserReady(true));
  }, [isAuthenticated, userReady, getOrCreateUser]);

  const tenant = useQuery(
    api.tenants.getForCurrentUser,
    isAuthenticated && userReady ? {} : "skip",
  );

  const isOnboardingComplete = useQuery(
    api.accounts.isOnboardingComplete,
    isAuthenticated && userReady ? {} : "skip",
  );

  useEffect(() => {
    if (!userReady) return;

    // Still loading tenant query
    if (tenant === undefined) return;

    // No tenant or not active → provisioning
    if (tenant === null || tenant.status !== "active") {
      router.replace("/setup/provisioning");
      return;
    }

    // Tenant is active — wait for onboarding check
    if (isOnboardingComplete === undefined) return;

    if (isOnboardingComplete) {
      router.replace("/board");
    } else {
      router.replace("/setup");
    }
  }, [tenant, isOnboardingComplete, userReady, router]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}
