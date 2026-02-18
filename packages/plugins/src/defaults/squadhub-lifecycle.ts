import type {
  SquadhubLifecycle,
  SquadhubStatus,
} from "../interfaces/squadhub-lifecycle";

/**
 * Default squadhub lifecycle — all operations are no-ops.
 * Override with a cloud implementation to manage real infrastructure.
 */
export class DefaultSquadhubLifecycle implements SquadhubLifecycle {
  async restart(): Promise<void> {}

  async stop(): Promise<void> {}

  async destroy(): Promise<void> {}

  async getStatus(): Promise<SquadhubStatus> {
    return { running: true, healthy: true };
  }
}
