"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@clawe/backend";

export type Squad = {
  id: string;
  name: string;
  description?: string;
};

type SquadContextType = {
  squads: Squad[];
  selectedSquad: Squad | null;
  setSelectedSquad: (squad: Squad) => void;
  isLoading: boolean;
};

const SquadContext = createContext<SquadContextType | null>(null);

export const SquadProvider = ({ children }: { children: ReactNode }) => {
  const tenant = useQuery(api.tenants.getGeneral);
  const isLoading = tenant === undefined;

  const squad: Squad | null = tenant
    ? { id: tenant._id, name: tenant.name, description: tenant.description }
    : null;

  const squads = squad ? [squad] : [];

  return (
    <SquadContext.Provider
      value={{
        squads,
        selectedSquad: squad,
        setSelectedSquad: () => {},
        isLoading,
      }}
    >
      {children}
    </SquadContext.Provider>
  );
};

export const useSquad = () => {
  const context = useContext(SquadContext);
  if (!context) {
    throw new Error("useSquad must be used within a SquadProvider");
  }
  return context;
};
