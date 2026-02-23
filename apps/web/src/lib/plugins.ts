import { getPlugin, hasPlugin, registerPlugins } from "@clawe/plugins";
import type { PluginMap } from "@clawe/plugins";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

let loading: Promise<void> | undefined;

async function ensurePlugins(): Promise<void> {
  if (hasPlugin() || !config.isCloud) return;
  if (!loading) {
    loading = (async () => {
      const { register } = await import(
        /* webpackIgnore: true */ "@clawe/cloud-plugins"
      );
      registerPlugins(register(logger), logger);
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
