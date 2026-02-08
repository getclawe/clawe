"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { SquareKanban, Bot, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { NavMain, type NavItem } from "./nav-main";
import { NavSettings } from "./nav-settings";
import { NavUser } from "./nav-user";
import { SquadSwitcher } from "./squad-switcher";
import { SidebarNavProvider, useSidebarNav } from "./sidebar-nav-provider";
import { isLockedSidebarRoute } from "./sidebar-config";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@clawe/ui/components/sidebar";

const slideVariants = {
  enterFromRight: { x: "100%", opacity: 0 },
  enterFromLeft: { x: "-100%", opacity: 0 },
  center: { x: 0, opacity: 1 },
  exitToLeft: { x: "-100%", opacity: 0 },
  exitToRight: { x: "100%", opacity: 0 },
};

const SidebarNavContent = () => {
  const router = useRouter();
  const { view, goToSettings } = useSidebarNav();

  const handleSettingsClick = () => {
    goToSettings();
    router.push("/settings");
  };

  const navItems: NavItem[] = [
    {
      title: "Board",
      url: "/board",
      icon: SquareKanban,
    },
    {
      title: "Agents",
      url: "/agents",
      icon: Bot,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      onClick: handleSettingsClick,
    },
  ];

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        {view === "main" ? (
          <motion.div
            key="main"
            initial="enterFromLeft"
            animate="center"
            exit="exitToLeft"
            variants={slideVariants}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="flex flex-1 flex-col"
          >
            <NavMain items={navItems} />
          </motion.div>
        ) : (
          <motion.div
            key="settings"
            initial="enterFromRight"
            animate="center"
            exit="exitToRight"
            variants={slideVariants}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="flex flex-1 flex-col"
          >
            <NavSettings />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DashboardSidebar = ({
  ...props
}: React.ComponentProps<typeof Sidebar>) => {
  const pathname = usePathname();
  const hideRail = isLockedSidebarRoute(pathname);

  return (
    <SidebarNavProvider>
      <Sidebar collapsible="icon" variant="inset" {...props}>
        <SidebarHeader className="h-12 justify-center group-data-[collapsible=icon]:px-0">
          <SquadSwitcher />
        </SidebarHeader>
        <SidebarContent className="overflow-hidden">
          <SidebarNavContent />
        </SidebarContent>
        <SidebarFooter className="justify-center group-data-[collapsible=icon]:px-0">
          <NavUser />
        </SidebarFooter>
        {!hideRail && <SidebarRail />}
      </Sidebar>
    </SidebarNavProvider>
  );
};
