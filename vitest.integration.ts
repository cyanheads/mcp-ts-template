import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  ssr: {
    noExternal: ['zod'],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts', 'tests/integration/**/*.int.test.ts'],
    pool: 'forks',
    maxWorkers: 1, // Sequential — shared server processes
    isolate: true,
    testTimeout: 30_000, // Longer timeout for subprocess startup
    hookTimeout: 30_000, // Server subprocess needs time to start
  },
});
