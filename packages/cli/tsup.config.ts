import { defineConfig } from "tsup";

export default defineConfig({
  entry: { clawe: "src/index.ts" },
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  bundle: true,
  // Bundle all dependencies into single file
  noExternal: [/.*/],
  // Add shebang for CLI executable
  banner: {
    js: "#!/usr/bin/env node",
  },
});
