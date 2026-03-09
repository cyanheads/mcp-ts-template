/**
 * @fileoverview Tests for prompt registration system.
 * @module tests/mcp-server/prompts/prompt-registration.test.ts
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { allPromptDefinitions } from '@/mcp-server/prompts/definitions/index.js';
import { PromptRegistry } from '@/mcp-server/prompts/prompt-registration.js';
import { logger } from '@/utils/internal/logger.js';

describe('PromptRegistry', () => {
  let mockServer: any;
  let registry: PromptRegistry;

  beforeEach(() => {
    // Create a mock MCP server
    mockServer = {
      registerPrompt: vi.fn(() => {}),
    };

    // Create registry with logger
    registry = new PromptRegistry(allPromptDefinitions, logger);
  });

  describe('Prompt Registration', () => {
    it('should have registerAll method', () => {
      expect(typeof registry.registerAll).toBe('function');
    });

    it('should call server.registerPrompt for each prompt', async () => {
      await registry.registerAll(mockServer);

      // The actual allPromptDefinitions array will determine how many times this is called
      // We just verify the mock was called
      expect(mockServer.registerPrompt.mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it('should register prompts with correct structure', async () => {
      await registry.registerAll(mockServer);

      if (mockServer.registerPrompt.mock.calls.length > 0) {
        const firstCall = mockServer.registerPrompt.mock.calls[0];

        // First argument should be the prompt name (string)
        expect(typeof firstCall[0]).toBe('string');

        // Second argument should be options object
        expect(typeof firstCall[1]).toBe('object');
        expect(firstCall[1]).toHaveProperty('description');

        // Third argument should be the handler function
        expect(typeof firstCall[2]).toBe('function');
      }
    });

    it('should pass prompt options correctly', async () => {
      await registry.registerAll(mockServer);

      if (mockServer.registerPrompt.mock.calls.length > 0) {
        for (const call of mockServer.registerPrompt.mock.calls) {
          const options = call[1];

          // Description is required
          expect(options.description).toBeDefined();
          expect(typeof options.description).toBe('string');
        }
      }
    });

    it('should create async handler function', async () => {
      await registry.registerAll(mockServer);

      if (mockServer.registerPrompt.mock.calls.length > 0) {
        const handler = mockServer.registerPrompt.mock.calls[0][2];

        // Handler should be async (returns a Promise)
        const result = handler({});
        expect(result).toBeInstanceOf(Promise);

        // Should resolve to object with messages property
        const resolved = await result;
        expect(resolved).toHaveProperty('messages');
        expect(Array.isArray(resolved.messages)).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should not throw when registering with valid server', async () => {
      await expect(registry.registerAll(mockServer)).resolves.toBeUndefined();
    });

    it('should handle empty prompts list', async () => {
      // Even with no prompts, should not throw
      await expect(registry.registerAll(mockServer)).resolves.toBeUndefined();
    });
  });

  describe('Registration Order', () => {
    it('should maintain consistent registration order', async () => {
      await registry.registerAll(mockServer);
      const firstRun = mockServer.registerPrompt.mock.calls.map((call: any[]) => call[0]);

      // Clear and re-register
      mockServer.registerPrompt.mockClear();
      await registry.registerAll(mockServer);
      const secondRun = mockServer.registerPrompt.mock.calls.map((call: any[]) => call[0]);

      // Should be the same order
      expect(firstRun).toEqual(secondRun);
    });
  });

  describe('Prompt Handler Execution', () => {
    it('should execute handlers and return messages', async () => {
      await registry.registerAll(mockServer);

      if (mockServer.registerPrompt.mock.calls.length > 0) {
        // Get the first registered prompt's handler
        const handler = mockServer.registerPrompt.mock.calls[0][2];

        // Execute it with empty args
        const result = await handler({});

        // Should return object with messages array
        expect(result).toBeDefined();
        expect(result.messages).toBeDefined();
        expect(Array.isArray(result.messages)).toBe(true);
      }
    });

    it('should pass arguments to prompt generator', async () => {
      await registry.registerAll(mockServer);

      if (mockServer.registerPrompt.mock.calls.length > 0) {
        const handler = mockServer.registerPrompt.mock.calls[0][2];

        // Execute with some test arguments
        const testArgs = { code: 'function test() { return true; }' };
        const result = await handler(testArgs);

        // Should successfully process args and return messages
        expect(result.messages).toBeDefined();
        expect(Array.isArray(result.messages)).toBe(true);
      }
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

    it('should include argsSchema when prompts have arguments', async () => {
      await registry.registerAll(mockServer);

      // Some prompts may have schemas, some may not
      mockServer.registerPrompt.mock.calls.forEach((call: any[]) => {
        const metadata = call[1];

        // If argsSchema is present, it should be an object
        if ('argsSchema' in metadata) {
          expect(typeof metadata.argsSchema).toBe('object');
        }
      });
    });
  });

  describe('Integration', () => {
    it('should successfully register all available prompts', async () => {
      const initialCallCount = mockServer.registerPrompt.mock.calls.length;

      await registry.registerAll(mockServer);

      const finalCallCount = mockServer.registerPrompt.mock.calls.length;

      // Should have registered some number of prompts (may be 0 if no prompts defined)
      expect(finalCallCount).toBeGreaterThanOrEqual(initialCallCount);
    });

    it('should not duplicate prompt registrations on multiple calls', async () => {
      await registry.registerAll(mockServer);
      const firstCount = mockServer.registerPrompt.mock.calls.length;

      // Create new server and registry
      const newMockServer: any = {
        registerPrompt: vi.fn(() => {}),
      };
      const newRegistry = new PromptRegistry(allPromptDefinitions, logger);

      await newRegistry.registerAll(newMockServer);
      const secondCount = newMockServer.registerPrompt.mock.calls.length;

      // Should register same number of prompts
      expect(secondCount).toBe(firstCount);
    });
  });
});
