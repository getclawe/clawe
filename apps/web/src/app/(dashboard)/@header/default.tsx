"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@clawe/ui/components/separator";
import { SidebarToggle } from "@dashboard/sidebar-toggle";
import { ChatPanelToggle } from "@dashboard/chat-panel-toggle";
import { isLockedSidebarRoute } from "@dashboard/sidebar-config";
import { AgencyStatus } from "@/components/agency-status";

const DefaultHeaderContent = () => {
  const pathname = usePathname();
  const isSidebarLocked = isLockedSidebarRoute(pathname);

  return (
    <div className="flex w-full items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {isSidebarLocked ? (
          <div className="mr-0.5" />
        ) : (
          <>
            <SidebarToggle className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <AgencyStatus />
        <Separator
          orientation="vertical"
          className="data-[orientation=vertical]:h-4"
        />
        <ChatPanelToggle />
      </div>
    </div>
  );
};

export default DefaultHeaderContent;
