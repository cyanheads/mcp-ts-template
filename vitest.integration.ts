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
    include: ['tests/integration/**/*.test.ts'],
    pool: 'forks',
    maxWorkers: 1, // Sequential — shared server processes
    isolate: true,
    testTimeout: 30_000, // Longer timeout for subprocess startup
    hookTimeout: 30_000, // Server subprocess needs time to start
  },
});
