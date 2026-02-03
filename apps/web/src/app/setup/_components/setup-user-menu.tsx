"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback } from "@clawe/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@clawe/ui/components/dropdown-menu";

export const SetupUserMenu = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus-visible:ring-ring rounded-full transition-colors focus:outline-none focus-visible:ring-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
              U
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuItem onClick={toggleTheme}>
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
          Toggle theme
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
