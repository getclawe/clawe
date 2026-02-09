import { UserX } from "lucide-react";

import { Avatar, AvatarFallback } from "@clawe/ui/components/avatar";
import { cn } from "@clawe/ui/lib/utils";

export interface UserMenuAvatarProps {
  guestMode: boolean;
  initials: string;
  size?: "sm" | "md" | "lg";
  rounded?: "lg" | "full";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
};

const roundedClasses = {
  lg: "rounded-lg",
  full: "rounded-full",
};

export const UserMenuAvatar = ({
  guestMode,
  initials,
  size = "sm",
  rounded = "lg",
  className,
}: UserMenuAvatarProps) => {
  const sizeClass = sizeClasses[size];
  const roundedClass = roundedClasses[rounded];

  if (guestMode) {
    return (
      <Avatar
        className={cn(
          "border-muted-foreground/40 border-2 border-dashed",
          sizeClass,
          roundedClass,
          className,
        )}
      >
        <AvatarFallback className={cn("bg-muted", roundedClass)}>
          <UserX className="text-muted-foreground h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar className={cn(sizeClass, roundedClass, className)}>
      <AvatarFallback className={roundedClass}>{initials}</AvatarFallback>
    </Avatar>
  );
};
