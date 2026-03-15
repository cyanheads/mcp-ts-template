import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  // Inline zod to fix Vite SSR transform issues with Zod 4
  ssr: {
    noExternal: ['zod'],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Integration tests use real modules (no mocks) and have their own config
    exclude: ['tests/integration/**', 'node_modules/**'],
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
  },
});
