/**
 * @fileoverview Test suite for dependency injection tokens
 * @module tests/container/tokens.test
 */

import { describe, expect, it } from 'vitest';
import * as tokens from '@/container/tokens.js';

describe('DI Tokens', () => {
  describe('Token Definitions', () => {
    it('should export all required tokens', () => {
      expect(tokens.AppConfig).toBeDefined();
      expect(tokens.Logger).toBeDefined();
      expect(tokens.StorageService).toBeDefined();
      expect(tokens.StorageProvider).toBeDefined();
      expect(tokens.LlmProvider).toBeDefined();
      expect(tokens.ToolDefinitions).toBeDefined();
      expect(tokens.ResourceDefinitions).toBeDefined();
      expect(tokens.CreateMcpServerInstance).toBeDefined();
      expect(tokens.RateLimiterService).toBeDefined();
      expect(tokens.TransportManagerToken).toBeDefined();
      expect(tokens.SupabaseAdminClient).toBeDefined();
      expect(tokens.SpeechService).toBeDefined();
    });

    it('should define tokens as Symbol instances', () => {
      expect(typeof tokens.AppConfig).toBe('symbol');
      expect(typeof tokens.Logger).toBe('symbol');
      expect(typeof tokens.StorageService).toBe('symbol');
      expect(typeof tokens.StorageProvider).toBe('symbol');
      expect(typeof tokens.LlmProvider).toBe('symbol');
      expect(typeof tokens.ToolDefinitions).toBe('symbol');
      expect(typeof tokens.ResourceDefinitions).toBe('symbol');
      expect(typeof tokens.CreateMcpServerInstance).toBe('symbol');
      expect(typeof tokens.RateLimiterService).toBe('symbol');
      expect(typeof tokens.TransportManagerToken).toBe('symbol');
      expect(typeof tokens.SupabaseAdminClient).toBe('symbol');
      expect(typeof tokens.SpeechService).toBe('symbol');
    });

    it('should have unique token values', () => {
      const tokenValues = [
        tokens.AppConfig,
        tokens.Logger,
        tokens.StorageService,
        tokens.StorageProvider,
        tokens.LlmProvider,
        tokens.ToolDefinitions,
        tokens.ResourceDefinitions,
        tokens.CreateMcpServerInstance,
        tokens.RateLimiterService,
        tokens.TransportManagerToken,
        tokens.SupabaseAdminClient,
        tokens.SpeechService,
      ];

      const uniqueValues = new Set(tokenValues);
      expect(uniqueValues.size).toBe(tokenValues.length);
    });

    it('should have descriptive names for all tokens', () => {
      expect(tokens.AppConfig.description).toBe('AppConfig');
      expect(tokens.Logger.description).toBe('Logger');
      expect(tokens.StorageService.description).toBe('StorageService');
      expect(tokens.StorageProvider.description).toBe('IStorageProvider');
      expect(tokens.LlmProvider.description).toBe('ILlmProvider');
      expect(tokens.ToolDefinitions.description).toBe('ToolDefinitions');
      expect(tokens.ResourceDefinitions.description).toBe(
        'ResourceDefinitions',
      );
      expect(tokens.CreateMcpServerInstance.description).toBe(
        'CreateMcpServerInstance',
      );
      expect(tokens.RateLimiterService.description).toBe('RateLimiterService');
      expect(tokens.TransportManagerToken.description).toBe('TransportManager');
      expect(tokens.SupabaseAdminClient.description).toBe(
        'SupabaseAdminClient',
      );
      expect(tokens.SpeechService.description).toBe('SpeechService');
    });
  });

  describe('Token Categories', () => {
    it('should have core service tokens', () => {
      const coreTokens = [
        tokens.AppConfig,
        tokens.Logger,
        tokens.StorageService,
        tokens.StorageProvider,
        tokens.RateLimiterService,
      ];

      coreTokens.forEach((token) => {
        expect(typeof token).toBe('symbol');
        expect(token).toBeDefined();
      });
    });

    it('should have MCP-specific tokens', () => {
      const mcpTokens = [
        tokens.ToolDefinitions,
        tokens.ResourceDefinitions,
        tokens.CreateMcpServerInstance,
        tokens.TransportManagerToken,
      ];

      mcpTokens.forEach((token) => {
        expect(typeof token).toBe('symbol');
        expect(token).toBeDefined();
      });
    });

    it('should have provider tokens', () => {
      const providerTokens = [
        tokens.LlmProvider,
        tokens.StorageProvider,
        tokens.SpeechService,
        tokens.SupabaseAdminClient,
      ];

      providerTokens.forEach((token) => {
        expect(typeof token).toBe('symbol');
        expect(token).toBeDefined();
      });
    });
  });

  describe('Token Immutability', () => {
    it('should not allow reassignment of tokens', () => {
      // Symbols are immutable by nature, but we can verify they can't be reassigned
      const originalValue = tokens.AppConfig;

      // TypeScript would prevent this at compile time, but we test runtime behavior
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        tokens.AppConfig = Symbol('NewAppConfig');
      }).toThrow();

      // Verify token hasn't changed
      expect(tokens.AppConfig).toBe(originalValue);
    });
  });

  describe('Token Usage in DI', () => {
    it('should be suitable for use as DI container keys', () => {
      // Symbols can be used as Map keys and object keys
      const testMap = new Map();
      testMap.set(tokens.AppConfig, 'test-value');

      expect(testMap.get(tokens.AppConfig)).toBe('test-value');
      expect(testMap.has(tokens.AppConfig)).toBe(true);
    });

    it('should maintain identity across references', () => {
      const ref1 = tokens.StorageService;
      const ref2 = tokens.StorageService;

      expect(ref1).toBe(ref2);
      expect(Object.is(ref1, ref2)).toBe(true);
    });
  });

  describe('Token Count', () => {
    it('should have exactly 14 tokens defined', () => {
      const exportedSymbols = Object.values(tokens).filter(
        (value) => typeof value === 'symbol',
      );

      expect(exportedSymbols.length).toBe(14);
    });

    it('should export no additional non-symbol values', () => {
      const exportedValues = Object.values(tokens);
      const allSymbols = exportedValues.every(
        (value) => typeof value === 'symbol',
      );

      expect(allSymbols).toBe(true);
    });
  });
});
