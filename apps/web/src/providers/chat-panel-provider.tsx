"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ChatPanelContextValue = {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
};

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export const useChatPanel = () => {
  const context = useContext(ChatPanelContext);
  if (!context) {
    throw new Error("useChatPanel must be used within ChatPanelProvider");
  }
  return context;
};

export const ChatPanelProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <ChatPanelContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </ChatPanelContext.Provider>
  );
};
