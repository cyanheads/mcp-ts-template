/**
 * @fileoverview Test suite for metrics utilities barrel export
 * @module tests/utils/metrics/index.test
 */

import { describe, expect, it } from 'vitest';

describe('Metrics Utilities Barrel Export', () => {
  describe('Exports from tokenCounter.ts', () => {
    it('should export countTokens function', async () => {
      const { countTokens } = await import('@/utils/metrics/index.js');

      expect(countTokens).toBeDefined();
      expect(typeof countTokens).toBe('function');
    });

    it('should export countChatTokens function', async () => {
      const { countChatTokens } = await import('@/utils/metrics/index.js');

      expect(countChatTokens).toBeDefined();
      expect(typeof countChatTokens).toBe('function');
    });

    it('should export ChatMessage type', async () => {
      const metricsModule = await import('@/utils/metrics/index.js');

      // Type exports can be checked via TypeScript compilation
      // Here we verify the module loads successfully
      expect(metricsModule).toBeDefined();
    });

    it('should export ModelHeuristics interface', async () => {
      const metricsModule = await import('@/utils/metrics/index.js');

      // Type exports can be checked via TypeScript compilation
      expect(metricsModule).toBeDefined();
    });

    it('should allow countTokens to be called', async () => {
      const { countTokens } = await import('@/utils/metrics/index.js');

      const result = await countTokens('hello world');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('should allow countChatTokens to be called', async () => {
      const { countChatTokens } = await import('@/utils/metrics/index.js');

      const messages = [{ role: 'user', content: 'Hello' }];
      const result = await countChatTokens(messages);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Exports from registry.ts', () => {
    it('should export metricsRegistry object', async () => {
      const { metricsRegistry } = await import('@/utils/metrics/index.js');

      expect(metricsRegistry).toBeDefined();
      expect(typeof metricsRegistry).toBe('object');
    });

    it('should have metricsRegistry.getCounter method', async () => {
      const { metricsRegistry } = await import('@/utils/metrics/index.js');

      expect(metricsRegistry.getCounter).toBeDefined();
      expect(typeof metricsRegistry.getCounter).toBe('function');
    });

    it('should have metricsRegistry.getHistogram method', async () => {
      const { metricsRegistry } = await import('@/utils/metrics/index.js');

      expect(metricsRegistry.getHistogram).toBeDefined();
      expect(typeof metricsRegistry.getHistogram).toBe('function');
    });

    it('should have metricsRegistry.add method', async () => {
      const { metricsRegistry } = await import('@/utils/metrics/index.js');

      expect(metricsRegistry.add).toBeDefined();
      expect(typeof metricsRegistry.add).toBe('function');
    });

    it('should have metricsRegistry.record method', async () => {
      const { metricsRegistry } = await import('@/utils/metrics/index.js');

      expect(metricsRegistry.record).toBeDefined();
      expect(typeof metricsRegistry.record).toBe('function');
    });

    it('should have metricsRegistry.enabled method', async () => {
      const { metricsRegistry } = await import('@/utils/metrics/index.js');

      expect(metricsRegistry.enabled).toBeDefined();
      expect(typeof metricsRegistry.enabled).toBe('function');
    });
  });

  describe('Complete Export Verification', () => {
    it('should export all expected symbols from metrics module', async () => {
      const metricsModule = await import('@/utils/metrics/index.js');

      // Verify all expected exports are present
      const expectedExports = [
        'countTokens',
        'countChatTokens',
        'metricsRegistry',
      ];

      expectedExports.forEach((exportName) => {
        expect(metricsModule).toHaveProperty(exportName);
      });
    });

    it('should not have unexpected exports', async () => {
      const metricsModule = await import('@/utils/metrics/index.js');

      // Get all exports
      const exports = Object.keys(metricsModule);

      // All exports should be known
      const knownExports = [
        'countTokens',
        'countChatTokens',
        'metricsRegistry',
      ];

      exports.forEach((exportName) => {
        expect(knownExports).toContain(exportName);
      });
    });
  });

  describe('Functional Integration', () => {
    it('should allow using countTokens through barrel export', async () => {
      const { countTokens } = await import('@/utils/metrics/index.js');

      const text = 'The quick brown fox jumps over the lazy dog';
      const tokens = await countTokens(text);

      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should allow using metricsRegistry through barrel export', async () => {
      const { metricsRegistry } = await import('@/utils/metrics/index.js');

      // Test that methods can be called (may be no-op if OTel disabled)
      expect(() => {
        metricsRegistry.add('test_counter', 1);
        metricsRegistry.record('test_histogram', 100);
      }).not.toThrow();
    });
  });
});
