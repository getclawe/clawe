import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.{ts,tsx}"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@clawe/backend": path.resolve(
        __dirname,
        "../../packages/backend/convex/_generated/api",
      ),
    },
  },
});
