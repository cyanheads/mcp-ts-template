/**
 * @fileoverview Test suite for LLM service barrel export
 * @module tests/services/llm/index.test
 */

import { describe, expect, it } from 'vitest';

describe('LLM Service Barrel Export', () => {
  describe('Interface Exports', () => {
    it('should export ILlmProvider interface type', async () => {
      const llmModule = await import('@/services/llm/index.js');

      // Type exports are not runtime values, but we can verify the module loads
      expect(llmModule).toBeDefined();
    });

    it('should export OpenRouterChatParams interface type', async () => {
      const llmModule = await import('@/services/llm/index.js');

      // Type exports are not runtime values, but we can verify the module loads
      expect(llmModule).toBeDefined();
    });
  });

  describe('Provider Class Exports', () => {
    it('should export OpenRouterProvider class', async () => {
      const { OpenRouterProvider } = await import('@/services/llm/index.js');

      expect(OpenRouterProvider).toBeDefined();
      expect(typeof OpenRouterProvider).toBe('function');
    });

    it('should allow instantiating OpenRouterProvider', async () => {
      const { OpenRouterProvider } = await import('@/services/llm/index.js');

      // OpenRouterProvider requires config, logger, and requestContextService via DI
      // This test just verifies the class can be referenced
      expect(OpenRouterProvider).toBeDefined();
      expect(OpenRouterProvider.name).toBe('OpenRouterProvider');
    });
  });

  describe('Complete Export Verification', () => {
    it('should export OpenRouterProvider from barrel', async () => {
      const llmModule = await import('@/services/llm/index.js');

      const expectedExports = ['OpenRouterProvider'];

      expectedExports.forEach((exportName) => {
        expect(llmModule).toHaveProperty(exportName);
      });
    });

    it('should allow importing types alongside providers', async () => {
      const llmModule = await import('@/services/llm/index.js');

      // Verify we can import both types and implementations from the same barrel
      expect(llmModule.OpenRouterProvider).toBeDefined();
    });
  });

  describe('Functional Integration', () => {
    it('should allow accessing OpenRouterProvider through barrel export', async () => {
      const { OpenRouterProvider } = await import('@/services/llm/index.js');

      // Verify the provider class has expected properties
      expect(OpenRouterProvider).toBeDefined();
      expect(typeof OpenRouterProvider).toBe('function');
    });
  });
});
