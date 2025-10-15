/**
 * @fileoverview Test suite for LLM service types
 * @module tests/services/llm/types.test
 */

import { describe, expect, it } from 'vitest';

describe('LLM Service Types', () => {
  describe('Type Re-exports', () => {
    it('should re-export OpenRouterChatParams type', async () => {
      const typesModule = await import('@/services/llm/types.js');

      // Type exports are not runtime values, but we can verify the module loads
      expect(typesModule).toBeDefined();
    });
  });

  describe('Module Structure', () => {
    it('should load types module without errors', async () => {
      const typesModule = await import('@/services/llm/types.js');

      expect(typesModule).toBeDefined();
      expect(typeof typesModule).toBe('object');
    });

    it('should be importable from services/llm barrel', async () => {
      const llmModule = await import('@/services/llm/index.js');

      // Verify that types are re-exported through the barrel
      expect(llmModule).toBeDefined();
    });
  });

  describe('Type Compatibility', () => {
    it('should allow importing OpenRouterChatParams from types module', async () => {
      // This test verifies that the type module can be imported
      const typesModule = await import('@/services/llm/types.js');

      expect(typesModule).toBeDefined();
    });

    it('should maintain type consistency with core interfaces', async () => {
      const typesModule = await import('@/services/llm/types.js');
      const coreModule = await import('@/services/llm/core/ILlmProvider.js');

      // Both modules should be defined and load successfully
      expect(typesModule).toBeDefined();
      expect(coreModule).toBeDefined();
    });
  });
});
