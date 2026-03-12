/**
 * @fileoverview Base Vitest configuration for consumer servers.
 * Extend this in your server's `vitest.config.ts`:
 *
 * ```ts
 * import { defineConfig, mergeConfig } from 'vitest/config';
 * import coreConfig from '@cyanheads/mcp-ts-core/vitest.config';
 *
 * export default mergeConfig(coreConfig, defineConfig({
 *   resolve: {
 *     alias: { '@/': new URL('./src/', import.meta.url).pathname },
 *   },
 * }));
 * ```
 *
 * @module vitest.config.base
 */
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  ssr: {
    noExternal: ['zod'],
  },
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    isolate: true,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
    },
  },
});
