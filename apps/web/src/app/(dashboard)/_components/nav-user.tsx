"use client";

import { ChevronsUpDown } from "lucide-react";

import { UserMenuAvatar, UserMenuContent } from "@/components/user-menu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@clawe/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@clawe/ui/components/sidebar";
import { useUserMenu } from "@/hooks/use-user-menu";

export const NavUser = () => {
  const { isMobile } = useSidebar();
  const { guestMode, user, displayName, initials, signOut } = useUserMenu();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserMenuAvatar guestMode={guestMode} initials={initials} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                {guestMode ? (
                  <>
                    <span className="text-muted-foreground truncate font-medium">
                      Guest Mode
                    </span>
                    <span className="text-muted-foreground/70 truncate text-xs">
                      Not configured
                    </span>
                  </>
                ) : (
                  <>
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <UserMenuContent
            guestMode={guestMode}
            user={user}
            displayName={displayName}
            initials={initials}
            side={isMobile ? "bottom" : "top"}
            align="end"
            sideOffset={4}
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            onSignOut={signOut}
          />
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
