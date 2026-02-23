/**
 * Type declaration for the optional cloud plugin package.
 * Loaded at runtime when NEXT_PUBLIC_CLAWE_EDITION=cloud.
 */
declare module "@clawe/cloud-plugins" {
  import type { PluginMap } from "./registry";
  import type { PluginLogger } from "./interfaces/logger";

  export function register(logger?: PluginLogger): PluginMap;
}
