"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/use-api-client";

export type SquadhubStatus = "active" | "down" | "restarting" | "idle";

export const useSquadhubStatus = () => {
  const apiClient = useApiClient();

  const { data, isLoading } = useQuery({
    queryKey: ["squadhub-health"],
    queryFn: async (): Promise<{ ok: boolean; restarting: boolean }> => {
      try {
        const { data } = await apiClient.post(
          "/api/squadhub/health",
          {},
          { timeout: 8000 },
        );
        return {
          ok: data.ok === true,
          restarting: data.restarting === true,
        };
      } catch {
        return { ok: false, restarting: false };
      }
    },
    refetchInterval: (query) => {
      const status = query.state.data;
      if (status && !status.ok && status.restarting) return 3000;
      return 10000;
    },
    staleTime: 5000,
    retry: false,
  });

  const status: SquadhubStatus = isLoading
    ? "idle"
    : data?.ok
      ? "active"
      : data?.restarting
        ? "restarting"
        : "down";

  return { status, isHealthy: data?.ok ?? false, isLoading };
};
