import { getPlugin, hasPlugin, registerPlugins } from "@clawe/plugins";
import type { PluginMap, CloudPluginRegister } from "@clawe/plugins";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

const CLOUD_PLUGINS_PKG = "@clawe/cloud-plugins";

let loading: Promise<void> | undefined;

async function ensurePlugins(): Promise<void> {
  if (hasPlugin() || !config.isCloud) return;
  if (!loading) {
    loading = (async () => {
      const mod: { register: CloudPluginRegister } = await import(
        /* webpackIgnore: true */ CLOUD_PLUGINS_PKG
      );
      registerPlugins(mod.register(logger), logger);
    })();
  }
  await loading;
}

export async function resolvePlugin<K extends keyof PluginMap>(
  name: K,
): Promise<PluginMap[K]> {
  await ensurePlugins();
  return getPlugin(name);
}
