"use client";

import { LogOut, Moon, Sun, UserX } from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback } from "@clawe/ui/components/avatar";
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@clawe/ui/components/dropdown-menu";
import { cn } from "@clawe/ui/lib/utils";

export interface UserMenuContentProps {
  guestMode: boolean;
  user: {
    name: string;
    email: string;
  };
  displayName: string;
  initials: string;
  align?: "start" | "end" | "center";
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  className?: string;
  onSignOut?: () => void;
}

export const UserMenuContent = ({
  guestMode,
  user,
  displayName,
  initials,
  align = "end",
  side,
  sideOffset = 4,
  className,
  onSignOut,
}: UserMenuContentProps) => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (guestMode) {
    return (
      <DropdownMenuContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        className={cn(className)}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="border-muted-foreground/40 h-8 w-8 rounded-lg border-2 border-dashed">
              <AvatarFallback className="bg-muted rounded-lg">
                <UserX className="text-muted-foreground h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="text-muted-foreground truncate font-medium">
                Guest Mode
              </span>
              <span className="text-muted-foreground/70 truncate text-xs">
                Not configured
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={toggleTheme}>
            <Sun className="dark:hidden" />
            <Moon className="hidden dark:block" />
            Toggle theme
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    );
  }

  // Authenticated mode
  return (
    <DropdownMenuContent
      align={align}
      side={side}
      sideOffset={sideOffset}
      className={cn(className)}
    >
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{displayName}</span>
            <span className="truncate text-xs">{user.email}</span>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={toggleTheme}>
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
          Toggle theme
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onSignOut}>
        <LogOut />
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
};
