import { vi } from "vitest";

/**
 * Shared mock for `@/lib/api/tenant-auth` used across API route tests.
 * Import this before the route under test to set up the mock.
 *
 * Usage:
 *   vi.mock("@/lib/api/tenant-auth", () => mockTenantAuth);
 */
export const mockTenantAuth = {
  getAuthenticatedTenant: vi.fn(async () => ({
    error: null,
    convex: {},
    tenant: {
      _id: "test-tenant-id",
      squadhubUrl: "http://localhost:18790",
      squadhubToken: "test-token",
      status: "active",
    },
  })),
};
