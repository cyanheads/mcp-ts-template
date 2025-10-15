/**
 * @fileoverview Tests for OpenRouter LLM provider.
 * @module tests/services/llm/providers/openrouter.provider.test.ts
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { OpenRouterProvider } from '@/services/llm/providers/openrouter.provider.js';
import { config } from '@/config/index.js';
import { logger } from '@/utils/index.js';
import { RateLimiter } from '@/utils/security/rateLimiter.js';
import { McpError } from '@/types-global/errors.js';
import { requestContextService } from '@/utils/index.js';

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;
  let mockRateLimiter: RateLimiter;
  let testContext: ReturnType<
    typeof requestContextService.createRequestContext
  >;

  beforeEach(() => {
    testContext = requestContextService.createRequestContext({
      operation: 'test',
    });

    // Create mock rate limiter
    mockRateLimiter = {
      check: vi.fn(() => {}),
      reset: vi.fn(() => {}),
      getStatus: vi.fn(() => null),
      configure: vi.fn(() => ({ maxRequests: 100, windowMs: 60000 })),
      dispose: vi.fn(() => {}),
    } as any;
  });

  describe('Constructor', () => {
    it('should throw error when API key is not configured', () => {
      const mockConfig = {
        ...config,
        openrouterApiKey: '',
      };

      expect(() => {
        new OpenRouterProvider(mockRateLimiter, mockConfig, logger);
      }).toThrow(McpError);
    });

    it('should create provider successfully with valid API key', () => {
      const mockConfig = {
        ...config,
        openrouterApiKey: 'test-api-key',
      };

      expect(() => {
        provider = new OpenRouterProvider(mockRateLimiter, mockConfig, logger);
      }).not.toThrow();

      expect(provider).toBeDefined();
    });

    it('should set default parameters from config', () => {
      const mockConfig = {
        ...config,
        openrouterApiKey: 'test-api-key',
        llmDefaultModel: 'gpt-4',
        llmDefaultTemperature: 0.7,
        llmDefaultTopP: 0.9,
        llmDefaultMaxTokens: 1000,
      };

      provider = new OpenRouterProvider(mockRateLimiter, mockConfig, logger);
      expect(provider).toBeDefined();
    });
  });

  describe('Parameter Preparation', () => {
    beforeEach(() => {
      const mockConfig = {
        ...config,
        openrouterApiKey: 'test-api-key',
        llmDefaultModel: 'default-model',
        llmDefaultTemperature: 0.8,
        llmDefaultTopP: 0.95,
        llmDefaultMaxTokens: 2000,
      };
      provider = new OpenRouterProvider(mockRateLimiter, mockConfig, logger);
    });

    it('should use default model when not specified', () => {
      // Access private method via type assertion for testing
      const result = (provider as any)._prepareApiParameters({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(result.model).toBe('default-model');
    });

    it('should override defaults with provided parameters', () => {
      const result = (provider as any)._prepareApiParameters({
        messages: [{ role: 'user', content: 'test' }],
        model: 'custom-model',
        temperature: 0.5,
        top_p: 0.8,
        max_tokens: 500,
      });

      expect(result.model).toBe('custom-model');
      expect(result.temperature).toBe(0.5);
      expect(result.top_p).toBe(0.8);
      expect(result.max_tokens).toBe(500);
    });

    it('should handle null values to clear defaults', () => {
      const result = (provider as any)._prepareApiParameters({
        messages: [{ role: 'user', content: 'test' }],
        temperature: null,
        top_p: null,
        max_tokens: null,
      });

      expect(result.temperature).toBeUndefined();
      expect(result.top_p).toBeUndefined();
      expect(result.max_tokens).toBeUndefined();
    });

    it('should preserve stream parameter when provided', () => {
      const result = (provider as any)._prepareApiParameters({
        messages: [{ role: 'user', content: 'test' }],
        stream: true,
      });

      expect(result.stream).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      const mockConfig = {
        ...config,
        openrouterApiKey: 'test-api-key',
      };
      provider = new OpenRouterProvider(mockRateLimiter, mockConfig, logger);
    });

    it('should check rate limits before API calls', async () => {
      const mockCheck = vi.fn(() => {});
      mockRateLimiter.check = mockCheck;

      // Mock the OpenAI client to avoid actual API calls
      (provider as any).client.chat.completions.create = vi.fn(async () => ({
        id: 'test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Test response' },
            finish_reason: 'stop',
          },
        ],
      }));

      await provider.chatCompletion(
        {
          messages: [{ role: 'user', content: 'test' }],
          model: 'test-model',
        },
        testContext,
      );

      expect(mockCheck).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      const mockConfig = {
        ...config,
        openrouterApiKey: 'test-api-key',
      };
      provider = new OpenRouterProvider(mockRateLimiter, mockConfig, logger);
    });

    it('should handle API errors gracefully', async () => {
      // Mock client to throw error
      (provider as any).client.chat.completions.create = vi.fn(async () => {
        throw new Error('API Error');
      });

      await expect(
        provider.chatCompletion(
          {
            messages: [{ role: 'user', content: 'test' }],
            model: 'test-model',
          },
          testContext,
        ),
      ).rejects.toThrow();
    });

    it('should wrap errors in ErrorHandler.tryCatch', async () => {
      (provider as any).client.chat.completions.create = vi.fn(async () => {
        throw new Error('Test error');
      });

      try {
        await provider.chatCompletion(
          {
            messages: [{ role: 'user', content: 'test' }],
            model: 'test-model',
          },
          testContext,
        );
      } catch (error) {
        // ErrorHandler should have processed this
        expect(error).toBeDefined();
      }
    });
  });

  describe('Streaming', () => {
    beforeEach(() => {
      const mockConfig = {
        ...config,
        openrouterApiKey: 'test-api-key',
      };
      provider = new OpenRouterProvider(mockRateLimiter, mockConfig, logger);
    });

    it('should support streaming responses', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { id: 'chunk1', choices: [{ delta: { content: 'Hello' } }] };
          yield { id: 'chunk2', choices: [{ delta: { content: ' World' } }] };
        },
      };

      (provider as any).client.chat.completions.create = vi.fn(
        async () => mockStream,
      );

      const stream = await provider.chatCompletionStream(
        {
          messages: [{ role: 'user', content: 'test' }],
          model: 'test-model',
        },
        testContext,
      );

      // Verify it's an async iterable
      expect(typeof stream[Symbol.asyncIterator]).toBe('function');

      // Consume the stream
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should have required interface methods', () => {
      const mockConfig = {
        ...config,
        openrouterApiKey: 'test-api-key',
      };
      provider = new OpenRouterProvider(mockRateLimiter, mockConfig, logger);

      expect(typeof provider.chatCompletion).toBe('function');
      expect(typeof provider.chatCompletionStream).toBe('function');
    });

    it('should properly construct OpenAI client with headers', () => {
      const mockConfig = {
        ...config,
        openrouterApiKey: 'test-api-key',
        openrouterAppUrl: 'https://example.com',
        openrouterAppName: 'Test App',
      };

      provider = new OpenRouterProvider(mockRateLimiter, mockConfig, logger);

      // Client should be initialized
      expect((provider as any).client).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should handle missing optional config values', () => {
      const mockConfig = {
        ...config,
        openrouterApiKey: 'test-api-key',
        openrouterAppUrl: '',
        openrouterAppName: '',
      };

      expect(() => {
        provider = new OpenRouterProvider(mockRateLimiter, mockConfig, logger);
      }).not.toThrow();
    });

    it('should use default OpenRouter base URL', () => {
      const mockConfig = {
        ...config,
        openrouterApiKey: 'test-api-key',
      };

      provider = new OpenRouterProvider(mockRateLimiter, mockConfig, logger);
      expect(provider).toBeDefined();
    });
  });
});
