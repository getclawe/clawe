import type {
  SquadhubProvisioner,
  ProvisionResult,
  ProvisioningStatus,
} from "../interfaces/squadhub-provisioner";

/**
 * Default squadhub provisioner — reads connection from environment variables.
 * Override with a cloud implementation to provision real infrastructure.
 */
export class DefaultSquadhubProvisioner implements SquadhubProvisioner {
  async provision(): Promise<ProvisionResult> {
    return {
      squadhubUrl: process.env.SQUADHUB_URL ?? "http://localhost:18790",
      squadhubToken: process.env.SQUADHUB_TOKEN ?? "",
    };
  }

  async getProvisioningStatus(): Promise<ProvisioningStatus> {
    return { status: "active" };
  }

  async deprovision(): Promise<void> {}
}
