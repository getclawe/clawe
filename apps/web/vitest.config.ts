import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.spec.{ts,tsx}"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@clawe/backend": path.resolve(
        __dirname,
        "../../packages/backend/convex/_generated/api",
      ),
      "@clawe/shared/squadhub": path.resolve(
        __dirname,
        "../../packages/shared/src/squadhub/index.ts",
      ),
    },
  },
});
