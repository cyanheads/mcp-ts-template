import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  // Inline zod to fix Vite SSR transform issues with Zod 4
  ssr: {
    noExternal: ['zod'],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Conformance tests use real modules (no mocks) and have their own config
    exclude: ['tests/conformance/**', 'node_modules/**'],
    // Run tests in parallel with proper isolation to prevent mock pollution
    pool: 'forks',
    maxWorkers: 4,
    isolate: true,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 70,
        statements: 80,
      },
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
