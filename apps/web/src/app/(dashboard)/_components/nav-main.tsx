"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@clawe/ui/components/sidebar";
import { cn } from "@clawe/ui/lib/utils";

export const sidebarMenuButtonActiveStyles =
  "font-normal data-[active=true]:bg-transparent data-[active=true]:font-normal data-[active=true]:text-pink-600 data-[active=true]:hover:bg-pink-600/5 dark:data-[active=true]:bg-transparent dark:data-[active=true]:text-pink-400 dark:data-[active=true]:hover:bg-pink-400/5";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  onClick?: () => void;
  badge?: string;
  disabled?: boolean;
}

interface NavMainProps {
  items: NavItem[];
}

export const NavMain = ({ items }: NavMainProps) => {
  const pathname = usePathname();

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    return pathname.startsWith(url);
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
      <SidebarMenu>
        {items.map((item) => {
          const content = (
            <>
              <item.icon />
              <span>{item.title}</span>
            </>
          );

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild={!item.onClick && !item.disabled}
                onClick={item.disabled ? undefined : item.onClick}
                isActive={!item.disabled && isActive(item.url)}
                tooltip={
                  item.badge
                    ? {
                        children: (
                          <>
                            {item.title}{" "}
                            <span className="text-background/70 text-xs">
                              ({item.badge})
                            </span>
                          </>
                        ),
                      }
                    : item.title
                }
                className={cn(sidebarMenuButtonActiveStyles, {
                  "cursor-default opacity-50 hover:bg-transparent":
                    item.disabled,
                })}
              >
                {item.onClick || item.disabled ? (
                  content
                ) : (
                  <Link href={item.url}>{content}</Link>
                )}
              </SidebarMenuButton>
              {item.badge && (
                <SidebarMenuBadge className="bg-muted text-muted-foreground! rounded px-1.5 text-[10px] font-medium">
                  {item.badge}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};
