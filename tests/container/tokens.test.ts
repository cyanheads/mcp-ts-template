/**
 * @fileoverview Test suite for dependency injection tokens
 * @module tests/container/tokens.test
 */

import { describe, expect, it } from 'vitest';
import type { Token } from '@/container/core/container.js';
import * as tokens from '@/container/core/tokens.js';

/** All exported token names. */
const ALL_TOKEN_NAMES = [
  'AppConfig',
  'Logger',
  'StorageService',
  'StorageProvider',
  'SupabaseAdminClient',
  'LlmProvider',
  'RateLimiterService',
  'SpeechService',
  'CreateMcpServerInstance',
  'TransportManagerToken',
  'TaskManagerToken',
  'ToolRegistryToken',
  'ResourceRegistryToken',
  'PromptRegistryToken',
  'RootsRegistryToken',
  'ToolDefinitions',
  'ResourceDefinitions',
] as const;

/** Helper to get all token values. */
const getAllTokens = () =>
  ALL_TOKEN_NAMES.map(
    (name) => (tokens as Record<string, unknown>)[name] as Token<unknown>,
  );

describe('DI Tokens', () => {
  describe('Token Definitions', () => {
    it('should export all required tokens', () => {
      for (const name of ALL_TOKEN_NAMES) {
        expect(
          (tokens as Record<string, unknown>)[name],
          `Missing token: ${name}`,
        ).toBeDefined();
      }
    });

    it('should define tokens as Token<T> objects with symbol ids', () => {
      for (const t of getAllTokens()) {
        expect(typeof t).toBe('object');
        expect(typeof t.id).toBe('symbol');
        expect(typeof t.description).toBe('string');
      }
    });

    it('should have unique token ids', () => {
      const ids = getAllTokens().map((t) => t.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
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

      for (const t of coreTokens) {
        expect(typeof t.id).toBe('symbol');
        expect(t).toBeDefined();
      }
    });

    it('should have MCP-specific tokens', () => {
      const mcpTokens = [
        tokens.ToolDefinitions,
        tokens.ResourceDefinitions,
        tokens.CreateMcpServerInstance,
        tokens.TransportManagerToken,
      ];

      for (const t of mcpTokens) {
        expect(typeof t.id).toBe('symbol');
        expect(t).toBeDefined();
      }
    });

    it('should have provider tokens', () => {
      const providerTokens = [
        tokens.LlmProvider,
        tokens.StorageProvider,
        tokens.SpeechService,
        tokens.SupabaseAdminClient,
      ];

      for (const t of providerTokens) {
        expect(typeof t.id).toBe('symbol');
        expect(t).toBeDefined();
      }
    });
  });

  describe('Token Immutability', () => {
    it('should not allow reassignment of tokens', () => {
      const originalValue = tokens.AppConfig;

      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        tokens.AppConfig = { id: Symbol('fake'), description: 'fake' };
      }).toThrow();

      expect(tokens.AppConfig).toBe(originalValue);
    });
  });

  describe('Token Usage in DI', () => {
    it('should be suitable for use as DI container keys via token.id', () => {
      const testMap = new Map();
      testMap.set(tokens.AppConfig.id, 'test-value');

      expect(testMap.get(tokens.AppConfig.id)).toBe('test-value');
      expect(testMap.has(tokens.AppConfig.id)).toBe(true);
    });

    it('should maintain identity across references', () => {
      const ref1 = tokens.StorageService;
      const ref2 = tokens.StorageService;

      expect(ref1).toBe(ref2);
      expect(Object.is(ref1, ref2)).toBe(true);
    });
  });

  describe('Token Count', () => {
    it(`should have exactly ${ALL_TOKEN_NAMES.length} tokens defined`, () => {
      // token() + Token type are also exported; count only Token<T> shaped objects
      const exportedTokens = Object.values(tokens).filter((value) => {
        if (typeof value !== 'object' || value === null || !('id' in value)) {
          return false;
        }
        return typeof (value as { id: unknown }).id === 'symbol';
      });

      expect(exportedTokens.length).toBe(ALL_TOKEN_NAMES.length);
    });
  });
});
