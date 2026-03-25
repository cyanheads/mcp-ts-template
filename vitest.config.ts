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
    include: ['tests/unit/**/*.test.ts', 'tests/compliance/**/*.test.ts', 'tests/smoke/**/*.test.ts', 'tests/fuzz/**/*.test.ts'],
    exclude: ['node_modules/**'],
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
