import type { TenantProvisioner } from "./interfaces/provisioner";
import type { SquadhubLifecycle } from "./interfaces/lifecycle";
import { DevProvisioner } from "./defaults/provisioner";
import { DevLifecycle } from "./defaults/lifecycle";

export interface PluginMap {
  provisioner: TenantProvisioner;
  lifecycle: SquadhubLifecycle;
}

let plugins: PluginMap = {
  provisioner: new DevProvisioner(),
  lifecycle: new DevLifecycle(),
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
