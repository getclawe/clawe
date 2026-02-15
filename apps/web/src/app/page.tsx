"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@clawe/backend";

export default function Home() {
  const router = useRouter();
  const isOnboardingComplete = useQuery(api.tenants.isOnboardingComplete, {});

  useEffect(() => {
    // Wait for query to load
    if (isOnboardingComplete === undefined) return;

    if (isOnboardingComplete) {
      router.replace("/board");
    } else {
      router.replace("/setup");
    }
  }, [isOnboardingComplete, router]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}
