import type { PluginLogger } from "./interfaces/logger";
import type { SquadhubProvisioner } from "./interfaces/squadhub-provisioner";
import type { SquadhubLifecycle } from "./interfaces/squadhub-lifecycle";
import { DefaultSquadhubProvisioner } from "./defaults/squadhub-provisioner";
import { DefaultSquadhubLifecycle } from "./defaults/squadhub-lifecycle";

export interface PluginMap {
  "squadhub-provisioner": SquadhubProvisioner;
  "squadhub-lifecycle": SquadhubLifecycle;
}

let plugins: PluginMap = {
  "squadhub-provisioner": new DefaultSquadhubProvisioner(),
  "squadhub-lifecycle": new DefaultSquadhubLifecycle(),
};

let registered = false;

/**
 * Register plugin implementations. Call once at app startup.
 * If never called, dev defaults are used.
 */
export function registerPlugins(map: PluginMap, logger?: PluginLogger): void {
  plugins = map;
  registered = true;
  logger?.info({ plugins: Object.keys(map) }, "Cloud plugins registered");
}

/** Returns true if external plugins were registered (vs dev defaults). */
export function hasPlugin(): boolean {
  return registered;
}

/** Get a plugin implementation. Always returns something (registered or dev default). */
export function getPlugin<K extends keyof PluginMap>(name: K): PluginMap[K] {
  return plugins[name];
}

/** Function signature that cloud-plugins must export as `register`. */
export type CloudPluginRegister = (logger?: PluginLogger) => PluginMap;
