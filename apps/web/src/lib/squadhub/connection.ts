import type { SquadhubConnection } from "@clawe/shared/squadhub";
import type { Tenant } from "@clawe/backend/types";

/**
 * Get the squadhub connection for a tenant.
 * If a tenant with squadhubUrl/squadhubToken is provided, uses those.
 * Otherwise falls back to env vars (self-hosted / dev).
 */
export function getConnection(tenant?: Tenant | null): SquadhubConnection {
  return {
    squadhubUrl:
      tenant?.squadhubUrl ||
      process.env.SQUADHUB_URL ||
      "http://localhost:18790",
    squadhubToken: tenant?.squadhubToken || process.env.SQUADHUB_TOKEN || "",
  };
}
