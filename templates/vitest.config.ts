import { defineConfig, mergeConfig } from 'vitest/config';
import coreConfig from '@cyanheads/mcp-ts-core/vitest.config';

export default mergeConfig(
  coreConfig,
  defineConfig({
    resolve: {
      alias: { '@/': new URL('./src/', import.meta.url).pathname },
    },
    test: {
      include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    },
  }),
);
