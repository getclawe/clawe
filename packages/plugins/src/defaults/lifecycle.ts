import type {
  SquadhubLifecycle,
  SquadhubStatus,
} from "../interfaces/lifecycle";

/**
 * Dev/self-hosted lifecycle manager.
 * All operations are no-ops — user manages squadhub via docker compose.
 * Always reports healthy.
 */
export class DevLifecycle implements SquadhubLifecycle {
  async restart(): Promise<void> {
    // No-op — user manually restarts docker.
  }

  async stop(): Promise<void> {
    // No-op.
  }

  async destroy(): Promise<void> {
    // No-op.
  }

  async getStatus(): Promise<SquadhubStatus> {
    return { running: true, healthy: true };
  }
}
