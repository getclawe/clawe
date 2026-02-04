"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type AgencyStatus = "active" | "down" | "idle";

const checkAgencyHealth = async (): Promise<boolean> => {
  try {
    const { data } = await axios.post(
      "/api/agency/health",
      {},
      { timeout: 5000 },
    );
    return data.ok === true;
  } catch {
    return false;
  }
};

export const useAgencyStatus = () => {
  const { data: isHealthy, isLoading } = useQuery({
    queryKey: ["agency-health"],
    queryFn: checkAgencyHealth,
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000,
    retry: false,
  });

  const status: AgencyStatus = isLoading
    ? "idle"
    : isHealthy
      ? "active"
      : "down";

  return { status, isHealthy, isLoading };
};
