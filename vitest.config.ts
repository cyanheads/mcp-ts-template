import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Run tests in parallel with proper isolation to prevent mock pollution
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 11, // Use 11 of 12 available cores for maximum speed
        minForks: 8, // Start with 8 workers for minimal ramp-up time
        isolate: true, // CRITICAL: Each test file gets clean module state
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        '!src/index.ts',
        '!src/config/index.ts',
        '!src/container/index.ts',
      ],
    },
    fakeTimers: {
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'Date',
      ],
    },
  },
});
