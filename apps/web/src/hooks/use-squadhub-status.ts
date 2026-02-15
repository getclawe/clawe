"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type SquadhubStatus = "active" | "down" | "idle";

const checkSquadhubHealth = async (): Promise<boolean> => {
  try {
    const { data } = await axios.post(
      "/api/squadhub/health",
      {},
      { timeout: 5000 },
    );
    return data.ok === true;
  } catch {
    return false;
  }
};

export const useSquadhubStatus = () => {
  const { data: isHealthy, isLoading } = useQuery({
    queryKey: ["squadhub-health"],
    queryFn: checkSquadhubHealth,
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
