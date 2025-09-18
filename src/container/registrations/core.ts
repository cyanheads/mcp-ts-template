/**
 * @fileoverview Registers core application services with the DI container.
 * This module encapsulates the registration of fundamental services such as
 * configuration, logging, storage, and the LLM provider.
 * @module src/container/registrations/core
 */
import { container, Lifecycle } from 'tsyringe';
import { parseConfig } from '@/config/index.js';
import type { ILlmProvider } from '@/services/llm-providers/ILlmProvider.js';
import { OpenRouterProvider } from '@/services/llm-providers/openRouterProvider.js';
import { createStorageProvider } from '@/storage/core/storageFactory.js';
import { StorageService as StorageServiceClass } from '@/storage/core/StorageService.js';
import { logger } from '@/utils/index.js';
import { RateLimiter } from '@/utils/security/rateLimiter.js';
import {
  AppConfig,
  LlmProvider,
  Logger,
  RateLimiterService,
  StorageService,
  StorageProvider,
} from '@/container/tokens.js';

/**
 * Registers core application services and values with the tsyringe container.
 */
export const registerCoreServices = () => {
  // Configuration (parsed and registered as a static value)
  const config = parseConfig();
  container.register(AppConfig, { useValue: config });

  // Logger (as a static value)
  container.register(Logger, { useValue: logger });

  // --- Refactored Storage Service Registration ---
  // 1. Register the factory for the concrete provider against the provider token.
  // This factory depends on the AppConfig, which is already registered.
  container.register(StorageProvider, {
    useFactory: (c) => createStorageProvider(c.resolve(AppConfig)),
  });

  // 2. Register StorageServiceClass against the service token.
  //    tsyringe will automatically inject the StorageProvider dependency.
  container.register(
    StorageService,
    { useClass: StorageServiceClass },
    { lifecycle: Lifecycle.Singleton },
  );
  // --- End Refactor ---

  // LLM Provider (register the class against the interface token)
  container.register<ILlmProvider>(LlmProvider, {
    useClass: OpenRouterProvider,
  });

  // Register RateLimiter as a singleton service
  container.register<RateLimiter>(
    RateLimiterService,
    { useClass: RateLimiter },
    { lifecycle: Lifecycle.Singleton },
  );

  logger.info('Core services registered with the DI container.');
};
