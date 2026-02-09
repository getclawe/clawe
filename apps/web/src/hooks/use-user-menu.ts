// TODO: Replace with actual auth check when authentication is implemented
const GUEST_MODE = true;

// Mock user for authenticated mode
const mockUser = {
  name: "User",
  email: "user@example.com",
};

export const useUserMenu = () => {
  const guestMode = GUEST_MODE;
  const user = mockUser;
  const displayName = user.name;
  const initials = user.name.slice(0, 2).toUpperCase();

  return {
    guestMode,
    user,
    displayName,
    initials,
  };
};
