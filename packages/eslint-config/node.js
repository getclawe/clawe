import globals from "globals";
import nodePlugin from "eslint-plugin-n";
import { config as baseConfig } from "./base.js";

/**
 * ESLint configuration for Node.js applications.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const nodeConfig = [
  ...baseConfig,
  {
    plugins: { n: nodePlugin },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "n/file-extension-in-import": ["error", "always"],
    },
  },
  {
    ignores: ["dist/**"],
  },
];
