/**
 * @fileoverview Tests for prompt registration system.
 * @module tests/mcp-server/prompts/prompt-registration.test.ts
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { PromptRegistry } from '@/mcp-server/prompts/prompt-registration.js';
import { prompt } from '@/mcp-server/prompts/utils/newPromptDefinition.js';
import type { PromptDefinition } from '@/mcp-server/prompts/utils/promptDefinition.js';
import { logger } from '@/utils/internal/logger.js';

/** Inline test prompt using new-style builder. */
const testPrompt = prompt('test_prompt', {
  description: 'A test prompt for unit tests.',
  args: z.object({
    topic: z.string().optional().describe('Topic to discuss.'),
  }),
  generate: (args) => [
    {
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Discuss: ${args.topic ?? 'anything'}`,
      },
    },
  ],
});

/** Inline test prompt using legacy shape. */
const legacyPrompt: PromptDefinition<z.ZodObject<{ code: z.ZodOptional<z.ZodString> }>> = {
  name: 'legacy_prompt',
  description: 'A legacy-style prompt for testing.',
  argumentsSchema: z.object({
    code: z.string().optional().describe('Code to review.'),
  }),
  generate: (args) => [
    {
      role: 'user',
      content: { type: 'text', text: `Review: ${args.code ?? 'nothing'}` },
    },
  ],
};

const testDefinitions = [testPrompt, legacyPrompt];

describe('PromptRegistry', () => {
  let mockServer: any;
  let registry: PromptRegistry;

  beforeEach(() => {
    mockServer = {
      registerPrompt: vi.fn(() => {}),
    };
    registry = new PromptRegistry(testDefinitions, logger);
  });

  describe('Prompt Registration', () => {
    it('should have registerAll method', () => {
      expect(typeof registry.registerAll).toBe('function');
    });

    it('should call server.registerPrompt for each prompt', async () => {
      await registry.registerAll(mockServer);
      expect(mockServer.registerPrompt).toHaveBeenCalledTimes(2);
    });

    it('should register prompts with correct structure', async () => {
      await registry.registerAll(mockServer);

      const firstCall = mockServer.registerPrompt.mock.calls[0];
      expect(typeof firstCall[0]).toBe('string');
      expect(typeof firstCall[1]).toBe('object');
      expect(firstCall[1]).toHaveProperty('description');
      expect(typeof firstCall[2]).toBe('function');
    });

    it('should pass prompt options correctly', async () => {
      await registry.registerAll(mockServer);

      for (const call of mockServer.registerPrompt.mock.calls) {
        const options = call[1];
        expect(options.description).toBeDefined();
        expect(typeof options.description).toBe('string');
      }
    });

    it('should create async handler function', async () => {
      await registry.registerAll(mockServer);

      const handler = mockServer.registerPrompt.mock.calls[0][2];
      const result = handler({});
      expect(result).toBeInstanceOf(Promise);

      const resolved = await result;
      expect(resolved).toHaveProperty('messages');
      expect(Array.isArray(resolved.messages)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should not throw when registering with valid server', async () => {
      await expect(registry.registerAll(mockServer)).resolves.toBeUndefined();
    });

    it('should handle empty prompts list', async () => {
      const emptyRegistry = new PromptRegistry([], logger);
      await expect(emptyRegistry.registerAll(mockServer)).resolves.toBeUndefined();
    });
  });

  describe('Registration Order', () => {
    it('should maintain consistent registration order', async () => {
      await registry.registerAll(mockServer);
      const firstRun = mockServer.registerPrompt.mock.calls.map((call: any[]) => call[0]);

      mockServer.registerPrompt.mockClear();
      await registry.registerAll(mockServer);
      const secondRun = mockServer.registerPrompt.mock.calls.map((call: any[]) => call[0]);

      expect(firstRun).toEqual(secondRun);
    });
  });

  describe('Prompt Handler Execution', () => {
    it('should execute handlers and return messages', async () => {
      await registry.registerAll(mockServer);

      const handler = mockServer.registerPrompt.mock.calls[0][2];
      const result = await handler({});

      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it('should pass arguments to prompt generator', async () => {
      await registry.registerAll(mockServer);

      const handler = mockServer.registerPrompt.mock.calls[0][2];
      const result = await handler({ topic: 'testing' });

      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
    });
  });

  describe('Prompt Metadata', () => {
    it('should register prompts with descriptions', async () => {
      await registry.registerAll(mockServer);

      mockServer.registerPrompt.mock.calls.forEach((call: any[]) => {
        const metadata = call[1];
        expect(metadata.description).toBeDefined();
        expect(metadata.description.length).toBeGreaterThan(0);
      });
    });
  });
});
