"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@clawe/ui/components/scroll-area";
import { SidebarInset, SidebarProvider } from "@clawe/ui/components/sidebar";
import { DashboardSidebar } from "@dashboard/dashboard-sidebar";
import { isLockedSidebarRoute } from "@dashboard/sidebar-config";
import { SquadProvider } from "@/providers/squad-provider";
import { DrawerProvider } from "@/providers/drawer-provider";
import { ChatPanelProvider } from "@/providers/chat-panel-provider";
import { ChatPanel } from "@dashboard/chat-panel";
import { useRequireOnboarding } from "@/hooks/use-onboarding-guard";

type DashboardLayoutProps = {
  children: React.ReactNode;
  header: React.ReactNode;
};

// Routes that handle their own scrolling (e.g., kanban board)
const isFullHeightRoute = (path: string) => path === "/board";

// Routes that handle their own padding
const isNoPaddingRoute = (path: string) => path === "/board";

const DashboardLayout = ({ children, header }: DashboardLayoutProps) => {
  const pathname = usePathname();
  const { isLoading } = useRequireOnboarding();
  const [sidebarOpen, setSidebarOpen] = useState(
    () => !isLockedSidebarRoute(pathname),
  );

  const fullHeight = isFullHeightRoute(pathname);
  const noPadding = isNoPaddingRoute(pathname);

  // Update sidebar state when route changes
  useEffect(() => {
    setSidebarOpen(!isLockedSidebarRoute(pathname));
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <SquadProvider>
      <ChatPanelProvider>
        <SidebarProvider
          className="bg-sidebar h-svh overflow-hidden"
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          style={{ "--sidebar-width-icon": "2rem" } as React.CSSProperties}
        >
          <DashboardSidebar />
          <SidebarInset className="bg-background overflow-hidden rounded-none border md:rounded-xl md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-1">
            <header className="flex h-12 shrink-0 items-center gap-2 border-b">
              {header}
            </header>
            <DrawerProvider>
              {fullHeight ? (
                <main
                  className={`flex min-h-0 flex-1 flex-col overflow-hidden ${noPadding ? "" : "p-6"}`}
                >
                  {children}
                </main>
              ) : (
                <ScrollArea className="h-full min-h-0 flex-1">
                  <main className="p-6">{children}</main>
                </ScrollArea>
              )}
            </DrawerProvider>
          </SidebarInset>
          <ChatPanel />
        </SidebarProvider>
      </ChatPanelProvider>
    </SquadProvider>
  );
};

export default DashboardLayout;
