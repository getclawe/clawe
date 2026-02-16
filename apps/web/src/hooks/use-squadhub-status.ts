"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/use-api-client";

type SquadhubStatus = "active" | "down" | "idle";

export const useSquadhubStatus = () => {
  const apiClient = useApiClient();

  const { data: isHealthy, isLoading } = useQuery({
    queryKey: ["squadhub-health"],
    queryFn: async (): Promise<boolean> => {
      try {
        const { data } = await apiClient.post(
          "/api/squadhub/health",
          {},
          { timeout: 5000 },
        );
        return data.ok === true;
      } catch {
        return false;
      }
    },
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000,
    retry: false,
  });

  const status: SquadhubStatus = isLoading
    ? "idle"
    : isHealthy
      ? "active"
      : "down";

  return { status, isHealthy, isLoading };
};
