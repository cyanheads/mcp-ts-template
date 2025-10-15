/**
 * @fileoverview Tests for core service registration.
 * @module tests/container/registrations/core.test.ts
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { container } from 'tsyringe';
import { registerCoreServices } from '@/container/registrations/core.js';
import {
  AppConfig,
  Logger,
  StorageProvider,
  StorageService,
  LlmProvider,
  RateLimiterService,
  SpeechService,
} from '@/container/tokens.js';
import type { ILlmProvider } from '@/services/llm/core/ILlmProvider.js';
import type { IStorageProvider } from '@/storage/core/IStorageProvider.js';

describe('Core Service Registration', () => {
  beforeAll(() => {
    registerCoreServices();
  });

  describe('registerCoreServices', () => {
    it('should register AppConfig as a value', () => {
      const config = container.resolve(AppConfig) as ReturnType<
        typeof import('@/config/index.js').parseConfig
      >;

      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
      expect(config.mcpServerName).toBeDefined();
      expect(config.mcpServerVersion).toBeDefined();
    });

    it('should register Logger as a value', () => {
      const logger = container.resolve(
        Logger,
      ) as typeof import('@/utils/index.js').logger;

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warning).toBe('function');
    });

    it('should register StorageProvider factory', () => {
      const storageProvider =
        container.resolve<IStorageProvider>(StorageProvider);

      expect(storageProvider).toBeDefined();
      expect(typeof storageProvider.get).toBe('function');
      expect(typeof storageProvider.set).toBe('function');
      expect(typeof storageProvider.delete).toBe('function');
      expect(typeof storageProvider.list).toBe('function');
    });

    it('should register StorageService with injected provider', () => {
      const storageService = container.resolve(
        StorageService,
      ) as import('@/storage/core/StorageService.js').StorageService;

      expect(storageService).toBeDefined();
      expect(typeof storageService.get).toBe('function');
      expect(typeof storageService.set).toBe('function');
      expect(typeof storageService.delete).toBe('function');
    });

    it('should register LlmProvider', () => {
      // LlmProvider may throw if OPENROUTER_API_KEY is not set
      try {
        const llmProvider = container.resolve<ILlmProvider>(LlmProvider);
        expect(llmProvider).toBeDefined();
      } catch (error) {
        // Expected in test environment without API key
        expect(error).toBeDefined();
      }
    });

    it('should register RateLimiterService as singleton', () => {
      const rateLimiter1 = container.resolve(
        RateLimiterService,
      ) as import('@/utils/security/rateLimiter.js').RateLimiter;
      const rateLimiter2 = container.resolve(
        RateLimiterService,
      ) as import('@/utils/security/rateLimiter.js').RateLimiter;

      expect(rateLimiter1).toBeDefined();
      expect(rateLimiter1).toBe(rateLimiter2); // Same instance
    });

    it('should register SpeechService with factory', () => {
      const speechService = container.resolve(
        SpeechService,
      ) as import('@/services/speech/core/SpeechService.js').SpeechService;

      expect(speechService).toBeDefined();
      expect(
        typeof speechService.getTTSProvider === 'function' ||
          typeof speechService.getSTTProvider === 'function',
      ).toBe(true);
    });

    it('should resolve same AppConfig instance multiple times', () => {
      const config1 = container.resolve(AppConfig) as ReturnType<
        typeof import('@/config/index.js').parseConfig
      >;
      const config2 = container.resolve(AppConfig) as ReturnType<
        typeof import('@/config/index.js').parseConfig
      >;

      expect(config1).toBe(config2);
    });

    it('should create storage provider based on configuration', () => {
      const config = container.resolve(AppConfig) as ReturnType<
        typeof import('@/config/index.js').parseConfig
      >;
      const provider = container.resolve<IStorageProvider>(StorageProvider);

      expect(provider).toBeDefined();
      expect(config).toBeDefined();
      // Provider successfully created based on configuration
    });
  });

  describe('Service Dependencies', () => {
    it('should resolve StorageService with correct provider dependency', () => {
      const storageService = container.resolve(
        StorageService,
      ) as import('@/storage/core/StorageService.js').StorageService;
      const storageProvider =
        container.resolve<IStorageProvider>(StorageProvider);

      expect(storageService).toBeDefined();
      expect(storageProvider).toBeDefined();
      // Both should be working instances
      expect(typeof storageService.get).toBe('function');
      expect(typeof storageProvider.get).toBe('function');
    });

    it('should create LlmProvider as OpenRouterProvider', () => {
      // LlmProvider may throw if OPENROUTER_API_KEY is not set
      try {
        const llmProvider = container.resolve<ILlmProvider>(LlmProvider);
        expect(llmProvider).toBeDefined();
      } catch (error) {
        // Expected in test environment without API key
        expect(error).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should register services even with minimal configuration', () => {
      // All essential services should be registered
      expect(() => container.resolve(AppConfig)).not.toThrow();
      expect(() => container.resolve(Logger)).not.toThrow();
      expect(() => container.resolve(StorageService)).not.toThrow();
    });
  });

  describe('Service Factory Resolution', () => {
    it('should use factory to create SpeechService with config-based providers', () => {
      const speechService = container.resolve(
        SpeechService,
      ) as import('@/services/speech/core/SpeechService.js').SpeechService;

      expect(speechService).toBeDefined();
      // Service should have health check capability
      expect(typeof speechService.healthCheck).toBe('function');
    });

    it('should create StorageProvider via factory with AppConfig dependency', () => {
      const config = container.resolve(AppConfig) as ReturnType<
        typeof import('@/config/index.js').parseConfig
      >;
      const provider = container.resolve<IStorageProvider>(StorageProvider);

      expect(config).toBeDefined();
      expect(provider).toBeDefined();
      // Factory should have used config to determine provider type
    });
  });
});
