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

let pluginsLoaded = false;

/**
 * Initialize plugins. Call once at app startup.
 * Attempts to load an external plugin package.
 * If not available, keeps the dev defaults.
 */
export async function loadPlugins(): Promise<void> {
  if (pluginsLoaded) return;

  try {
    const external = await import(
      /* webpackIgnore: true */ "@clawe/cloud-plugins"
    );
    plugins = external.register();
    pluginsLoaded = true;
  } catch {
    // No external plugins installed — using dev defaults.
  }
}

/** Returns true if external plugins are loaded (vs dev defaults). */
export function hasPlugin(): boolean {
  return pluginsLoaded;
}

/** Get a plugin implementation. Always returns something (external or dev default). */
export function getPlugin<K extends keyof PluginMap>(name: K): PluginMap[K] {
  return plugins[name];
}
