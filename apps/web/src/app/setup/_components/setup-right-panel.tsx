"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

const SetupRightPanelContext = createContext<{
  content: ReactNode | null;
  setContent: (content: ReactNode | null) => void;
}>({
  content: null,
  setContent: () => {},
});

export const SetupRightPanelProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [content, setContent] = useState<ReactNode | null>(null);
  return (
    <SetupRightPanelContext.Provider value={{ content, setContent }}>
      {children}
    </SetupRightPanelContext.Provider>
  );
};

export const useSetupRightPanel = () => useContext(SetupRightPanelContext);

export const SetupRightPanelContent = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { setContent } = useSetupRightPanel();

  useEffect(() => {
    setContent(children);
    return () => setContent(null);
  }, [children, setContent]);

  return null;
};
