import type {
  TenantProvisioner,
  ProvisionResult,
  ProvisioningStatus,
} from "../interfaces/provisioner";

/**
 * Dev/self-hosted provisioner.
 * Reads SQUADHUB_URL and SQUADHUB_TOKEN from environment variables.
 * Returns immediately — no infrastructure to create.
 */
export class DevProvisioner implements TenantProvisioner {
  async provision(): Promise<ProvisionResult> {
    return {
      squadhubUrl: process.env.SQUADHUB_URL ?? "http://localhost:18790",
      squadhubToken: process.env.SQUADHUB_TOKEN ?? "",
    };
  }

  async getProvisioningStatus(): Promise<ProvisioningStatus> {
    return { status: "active" };
  }

  async deprovision(): Promise<void> {
    // No-op in dev — user manages squadhub via docker compose.
  }
}
