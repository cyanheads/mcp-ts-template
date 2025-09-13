/**
 * @fileoverview Registers core application services with the DI container.
 * This module encapsulates the registration of fundamental services such as
 * configuration, logging, storage, and the LLM provider.
 * @module src/container/registrations/core
 */
import { container, Lifecycle } from 'tsyringe';
import { config } from '../../config/index.js';
import { ILlmProvider } from '../../services/llm-providers/ILlmProvider.js';
import { OpenRouterProvider } from '../../services/llm-providers/openRouterProvider.js';
import { createStorageProvider, storageService } from '../../storage/index.js';
import { logger } from '../../utils/index.js';
import { RateLimiter } from '../../utils/security/rateLimiter.js';
import {
  AppConfig,
  LlmProvider,
  Logger,
  RateLimiterService,
  StorageService,
} from '../tokens.js';

/**
 * Registers core application services and values with the tsyringe container.
 */
export const registerCoreServices = () => {
  // Configuration (as a static value)
  container.register(AppConfig, { useValue: config });

  // Logger (as a static value)
  container.register(Logger, { useValue: logger });

  // Storage Service (initialized and registered as a singleton)
  const storageProvider = createStorageProvider();
  storageService.initialize(storageProvider);
  container.register(StorageService, { useValue: storageService });

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
