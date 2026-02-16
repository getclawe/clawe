/**
 * Type declaration for the optional external plugin package.
 * Dynamically imported by loadPlugins(). If not installed, dev defaults are used.
 */
declare module "@clawe/cloud-plugins" {
  import type { PluginMap } from "./registry";

  export function register(): PluginMap;
}
