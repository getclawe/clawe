"use client";

import { useAuth } from "@/providers/auth-provider";

export const useUserMenu = () => {
  const { isAuthenticated, user: authUser, signOut } = useAuth();

  const user = authUser
    ? { name: authUser.name ?? authUser.email, email: authUser.email }
    : { name: "User", email: "" };
  const displayName = user.name;
  const initials = displayName.slice(0, 2).toUpperCase();

  return {
    guestMode: !isAuthenticated,
    user,
    displayName,
    initials,
    signOut: isAuthenticated ? signOut : undefined,
  };
};
