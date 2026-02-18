import type { OpenClawPluginApi } from "./types";
import { registerPairingTool } from "./tools/pairing";

export default function register(api: OpenClawPluginApi) {
  registerPairingTool(api);
}
