"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@clawe/ui/components/separator";
import { SidebarToggle } from "@dashboard/sidebar-toggle";
import { ChatPanelToggle } from "@dashboard/chat-panel-toggle";
import { isLockedSidebarRoute } from "@dashboard/sidebar-config";
import { SquadhubStatus } from "@/components/squadhub-status";

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
        <Link
          href="https://www.clawe.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground text-base font-semibold"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          Clawe
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <SquadhubStatus />
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
