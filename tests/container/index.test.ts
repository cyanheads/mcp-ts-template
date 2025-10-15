/**
 * @fileoverview Tests for the dependency injection container composition.
 * @module tests/container/index.test.ts
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { container } from 'tsyringe';
import { composeContainer } from '@/container/index.js';
import {
  AppConfig,
  Logger,
  StorageService,
  LlmProvider,
  RateLimiterService,
} from '@/container/tokens.js';

describe('Container Composition', () => {
  // Compose container once for all tests since it's designed to be called once at app startup
  beforeAll(() => {
    composeContainer();
  });

  describe('composeContainer', () => {
    it('should register all core services', () => {
      // Services already composed in beforeAll
      // Verify core services are registered
      expect(() => container.resolve(AppConfig)).not.toThrow();
      expect(() => container.resolve(Logger)).not.toThrow();
      expect(() => container.resolve(StorageService)).not.toThrow();
      expect(() => container.resolve(RateLimiterService)).not.toThrow();
    });

    it('should be idempotent - calling multiple times should not re-register', () => {
      const firstConfig = container.resolve(AppConfig) as ReturnType<
        typeof import('@/config/index.js').parseConfig
      >;

      // Call again
      composeContainer();
      const secondConfig = container.resolve(AppConfig) as ReturnType<
        typeof import('@/config/index.js').parseConfig
      >;

      // Should be the same instance
      expect(firstConfig).toBe(secondConfig);
    });

    it('should resolve AppConfig with valid configuration', () => {
      const config = container.resolve(AppConfig) as ReturnType<
        typeof import('@/config/index.js').parseConfig
      >;

      expect(config).toBeDefined();
      expect(config.mcpServerName).toBeDefined();
      expect(config.mcpServerVersion).toBeDefined();
      expect(config.environment).toBeDefined();
    });

    it('should resolve Logger instance', () => {
      const logger = container.resolve(
        Logger,
      ) as typeof import('@/utils/index.js').logger;

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should resolve StorageService with injected provider', () => {
      const storageService = container.resolve(
        StorageService,
      ) as import('@/storage/core/StorageService.js').StorageService;

      expect(storageService).toBeDefined();
      expect(typeof storageService.get).toBe('function');
      expect(typeof storageService.set).toBe('function');
      expect(typeof storageService.delete).toBe('function');
    });

    it('should resolve RateLimiterService as singleton', () => {
      const rateLimiter1 = container.resolve(
        RateLimiterService,
      ) as import('@/utils/security/rateLimiter.js').RateLimiter;
      const rateLimiter2 = container.resolve(
        RateLimiterService,
      ) as import('@/utils/security/rateLimiter.js').RateLimiter;

      // Should be the same instance (singleton)
      expect(rateLimiter1).toBe(rateLimiter2);
    });
  });

  describe('Container Token Exports', () => {
    it('should export all required tokens', () => {
      expect(AppConfig).toBeDefined();
      expect(Logger).toBeDefined();
      expect(StorageService).toBeDefined();
      expect(LlmProvider).toBeDefined();
      expect(RateLimiterService).toBeDefined();
    });
  });
});
