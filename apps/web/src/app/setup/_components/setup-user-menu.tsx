"use client";

import { UserMenuAvatar, UserMenuContent } from "@/components/user-menu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@clawe/ui/components/dropdown-menu";
import { useUserMenu } from "@/hooks/use-user-menu";

export const SetupUserMenu = () => {
  const { guestMode, user, displayName, initials, signOut } = useUserMenu();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus-visible:ring-ring rounded-full transition-colors focus:outline-none focus-visible:ring-2">
          <UserMenuAvatar
            guestMode={guestMode}
            initials={initials}
            size="md"
            rounded="full"
          />
        </button>
      </DropdownMenuTrigger>
      <UserMenuContent
        guestMode={guestMode}
        user={user}
        displayName={displayName}
        initials={initials}
        align="end"
        sideOffset={8}
        className="w-64"
        onSignOut={signOut}
      />
    </DropdownMenu>
  );
};
