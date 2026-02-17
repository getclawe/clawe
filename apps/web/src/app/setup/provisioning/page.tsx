"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@clawe/backend";
import { AlertTriangle } from "lucide-react";
import { Button } from "@clawe/ui/components/button";
import { Spinner } from "@clawe/ui/components/spinner";
import { useAuth } from "@/providers/auth-provider";
import { useApiClient } from "@/hooks/use-api-client";

export default function ProvisioningPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const apiClient = useApiClient();
  const [error, setError] = useState<string | null>(null);
  const provisioningRef = useRef(false);

  const tenant = useQuery(
    api.tenants.getForCurrentUser,
    isAuthenticated ? {} : "skip",
  );

  const isOnboardingComplete = useQuery(
    api.accounts.isOnboardingComplete,
    isAuthenticated ? {} : "skip",
  );

  // Redirect when tenant becomes active
  useEffect(() => {
    if (tenant?.status !== "active") return;
    if (isOnboardingComplete === undefined) return;

    if (isOnboardingComplete) {
      router.replace("/board");
    } else {
      router.replace("/setup/welcome");
    }
  }, [tenant?.status, isOnboardingComplete, router]);

  const provision = useCallback(async () => {
    setError(null);
    try {
      await apiClient.post("/api/tenant/provision");
      // Convex subscription will reactively update `tenant` → redirect fires
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      provisioningRef.current = false;
    }
  }, [apiClient]);

  // Trigger provisioning when no active tenant
  useEffect(() => {
    if (!isAuthenticated) return;
    // Wait for tenant query to resolve
    if (tenant === undefined) return;
    // Already active — redirect effect handles it
    if (tenant?.status === "active") return;
    // Already provisioning in this render cycle
    if (provisioningRef.current) return;

    provisioningRef.current = true;
    provision();
  }, [isAuthenticated, tenant, provision]);

  if (error) {
    return (
      <div className="flex flex-1 items-start justify-center pt-[20vh]">
        <div className="flex w-full max-w-sm flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <AlertTriangle className="text-destructive h-10 w-10" />
            <h2 className="text-xl font-semibold">Setup failed</h2>
            <p className="text-muted-foreground text-center text-sm">{error}</p>
          </div>
          <Button variant="brand" onClick={provision}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-start justify-center pt-[20vh]">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="h-8 w-8" />
        <h2 className="text-lg font-semibold">Setting up your workspace...</h2>
        <p className="text-muted-foreground text-sm">
          This will only take a moment.
        </p>
      </div>
    </div>
  );
}
