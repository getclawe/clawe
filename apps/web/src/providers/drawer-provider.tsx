"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { X } from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";
import { Button } from "@clawe/ui/components/button";

type DrawerState = {
  isOpen: boolean;
  title?: React.ReactNode;
  content: React.ReactNode;
};

type DrawerContextValue = {
  isOpen: boolean;
  openDrawer: (content: React.ReactNode, title?: React.ReactNode) => void;
  closeDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error("useDrawer must be used within DrawerProvider");
  }
  return context;
};

export const DrawerProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<DrawerState>({
    isOpen: false,
    content: null,
  });

  const openDrawer = useCallback(
    (content: React.ReactNode, title?: React.ReactNode) => {
      setState({ isOpen: true, content, title });
    },
    [],
  );

  const closeDrawer = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state.isOpen) {
        closeDrawer();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state.isOpen, closeDrawer]);

  return (
    <DrawerContext.Provider
      value={{ isOpen: state.isOpen, openDrawer, closeDrawer }}
    >
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {children}

        {/* Overlay */}
        <div
          className={cn(
            "absolute inset-0 z-40 bg-black/5 transition-all duration-200",
            state.isOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={closeDrawer}
          aria-hidden="true"
        />

        {/* Drawer Panel */}
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Side panel"
          className={cn(
            "bg-background absolute inset-y-0 right-0 z-50 flex w-80 flex-col border-l transition-transform duration-200 ease-out",
            state.isOpen
              ? "translate-x-0 shadow-xl"
              : "translate-x-full shadow-none",
          )}
        >
          {/* Header */}
          {state.title && (
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2 font-semibold">
                {state.title}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={closeDrawer}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          )}

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-hidden">{state.content}</div>
        </div>
      </div>
    </DrawerContext.Provider>
  );
};
