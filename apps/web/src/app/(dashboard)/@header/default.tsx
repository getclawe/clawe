"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@clawe/ui/components/separator";
import { SidebarToggle } from "@dashboard/sidebar-toggle";
import { isLockedSidebarRoute } from "@dashboard/sidebar-config";
import { AgencyStatus } from "@/components/agency-status";

const DefaultHeaderContent = () => {
  const pathname = usePathname();
  const isSidebarLocked = isLockedSidebarRoute(pathname);

  return (
    <div className="flex items-center gap-2 px-4">
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
      <AgencyStatus size="sm" />
    </div>
  );
};

export default DefaultHeaderContent;
