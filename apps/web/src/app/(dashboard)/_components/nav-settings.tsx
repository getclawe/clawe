"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Settings2,
  AlertTriangle,
  Globe,
  KeyRound,
  Plug,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@clawe/ui/components/sidebar";
import { useSidebarNav } from "./sidebar-nav-provider";
import { sidebarMenuButtonActiveStyles } from "./nav-main";

const settingsItems = [
  {
    title: "General",
    url: "/settings/general",
    icon: Settings2,
  },
  {
    title: "API Keys",
    url: "/settings/api-keys",
    icon: KeyRound,
  },
  {
    title: "Business",
    url: "/settings/business",
    icon: Globe,
  },
  {
    title: "Integrations",
    url: "/settings/integrations",
    icon: Plug,
  },
  {
    title: "Danger zone",
    url: "/settings/danger-zone",
    icon: AlertTriangle,
  },
];

export const NavSettings = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { goToMain } = useSidebarNav();

  const handleBackToMain = () => {
    goToMain();
    router.push("/board");
  };

  const isActive = (url: string) => {
    return pathname === url || pathname.startsWith(url + "/");
  };

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleBackToMain}
              tooltip="Main Menu"
              className="font-normal"
            >
              <ChevronLeft />
              <span>Main Menu</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
          Squad Settings
        </SidebarGroupLabel>
        <SidebarMenu>
          {settingsItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
                className={sidebarMenuButtonActiveStyles}
              >
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
};
