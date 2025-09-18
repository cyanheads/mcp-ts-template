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
import { createStorageProvider } from '@/storage/index.js';
import { StorageService as StorageServiceClass } from '@/storage/core/StorageService.js';
import { logger } from '@/utils/index.js';
import { RateLimiter } from '@/utils/security/rateLimiter.js';
import {
  AppConfig,
  LlmProvider,
  Logger,
  RateLimiterService,
  StorageService,
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
  // Register StorageService as a singleton. The container will instantiate it.
  container.register<StorageServiceClass>(
    StorageService,
    { useClass: StorageServiceClass },
    { lifecycle: Lifecycle.Singleton },
  );

  // Resolve the singleton instance to initialize it.
  const storageServiceInstance =
    container.resolve<StorageServiceClass>(StorageService);
  const storageProvider = createStorageProvider();
  storageServiceInstance.initialize(storageProvider);
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
