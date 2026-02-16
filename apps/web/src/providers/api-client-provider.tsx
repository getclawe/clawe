"use client";

import { createContext, useMemo } from "react";
import type { AxiosInstance } from "axios";
import type { ReactNode } from "react";
import { createApiClient } from "@/lib/api/client";

export const ApiClientContext = createContext<AxiosInstance | null>(null);

export const ApiClientProvider = ({ children }: { children: ReactNode }) => {
  const apiClient = useMemo(() => createApiClient(), []);
  return (
    <ApiClientContext.Provider value={apiClient}>
      {children}
    </ApiClientContext.Provider>
  );
};
