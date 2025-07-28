import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.vitest.json"] })],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/index.ts",
        "src/agent/cli/boot.ts",
        "src/types-global/**",
        "**/*.d.ts",
        "**/index.ts",
        "src/mcp-server/resources/**",
        "src/mcp-client/client-config/mcp-config.json.example",
      ],
    },
    dir: "tests",
  },
});
