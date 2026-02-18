export interface SquadhubStatus {
  running: boolean;
  healthy: boolean;
}

export interface SquadhubLifecycle {
  /** Restart the tenant's squadhub service (e.g. after config change). */
  restart(tenantId: string): Promise<void>;

  /** Stop the tenant's squadhub service. */
  stop(tenantId: string): Promise<void>;

  /** Destroy tenant's squadhub resources permanently. */
  destroy(tenantId: string): Promise<void>;

  /** Check health/status of the tenant's squadhub. */
  getStatus(tenantId: string): Promise<SquadhubStatus>;
}
