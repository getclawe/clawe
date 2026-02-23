// Registry
export { registerPlugins, hasPlugin, getPlugin } from "./registry";
export type { PluginMap, CloudPluginRegister } from "./registry";

// Interfaces
export type {
  PluginLogger,
  SquadhubProvisioner,
  ProvisionParams,
  ProvisionResult,
  ProvisioningStatus,
  DeprovisionParams,
  SquadhubLifecycle,
  SquadhubStatus,
} from "./interfaces";

// Dev defaults (for testing and direct use)
export { DefaultSquadhubProvisioner } from "./defaults/squadhub-provisioner";
export { DefaultSquadhubLifecycle } from "./defaults/squadhub-lifecycle";
