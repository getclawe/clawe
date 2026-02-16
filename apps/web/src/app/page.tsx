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

  const isOnboardingComplete = useQuery(
    api.tenants.isOnboardingComplete,
    isAuthenticated && userReady ? {} : "skip",
  );

  useEffect(() => {
    if (!userReady || isOnboardingComplete === undefined) return;

    if (isOnboardingComplete) {
      router.replace("/board");
    } else {
      router.replace("/setup");
    }
  }, [isOnboardingComplete, userReady, router]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}
