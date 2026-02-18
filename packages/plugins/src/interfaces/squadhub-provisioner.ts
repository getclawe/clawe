export interface ProvisionParams {
  tenantId: string;
  accountId: string;
  anthropicApiKey?: string;
  convexUrl: string;
}

export interface ProvisionResult {
  squadhubUrl: string;
  squadhubToken: string;
  /** Plugin-specific metadata. */
  metadata?: Record<string, string>;
}

export interface ProvisioningStatus {
  status: "provisioning" | "active" | "error";
  message?: string;
}

export interface SquadhubProvisioner {
  /** Create infrastructure for a new tenant and return connection details. */
  provision(params: ProvisionParams): Promise<ProvisionResult>;

  /** Check provisioning progress (for polling UI). */
  getProvisioningStatus(tenantId: string): Promise<ProvisioningStatus>;

  /** Tear down all infrastructure for a tenant. */
  deprovision(tenantId: string): Promise<void>;
}
