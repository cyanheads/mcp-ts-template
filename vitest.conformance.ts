import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  ssr: {
    noExternal: ['zod'],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/conformance/**/*.test.ts'],
    // No setup file — conformance tests use real modules, no mocks
    pool: 'forks',
    // Sequential execution — shared server state within each file
    maxWorkers: 1,
    isolate: true,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
