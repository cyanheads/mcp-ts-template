// eslint.config.js

import pluginJs from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const combinedGlobals = { ...globals.browser, ...globals.node };
const trimmedGlobals = Object.fromEntries(
  Object.entries(combinedGlobals).map(([key, value]) => [key.trim(), value]),
);

export default tseslint.config(
  { languageOptions: { globals: trimmedGlobals } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked, // Use type-aware rules
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Add other type-aware rules as desired
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
  {
    ignores: [
      "eslint.config.js",
      "coverage/",
      "dist/",
      "logs/",
      "data/",
      "node_modules/",
    ],
  },
);
