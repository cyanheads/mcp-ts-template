/**
 * @fileoverview Registers core application services with the DI container.
 * This module encapsulates the registration of fundamental services such as
 * configuration, logging, storage, and the LLM provider.
 * @module src/container/registrations/core
 */
import { createClient } from '@supabase/supabase-js';
import Surreal from 'surrealdb';

import { parseConfig } from '@/config/index.js';
import { container } from '@/container/container.js';
import {
  AppConfig,
  GraphService,
  LlmProvider,
  Logger,
  RateLimiterService,
  SpeechService,
  StorageProvider,
  StorageService,
  SupabaseAdminClient,
  SurrealdbClient,
} from '@/container/tokens.js';
import { GraphService as GraphServiceClass } from '@/services/graph/core/GraphService.js';
import { SurrealGraphProvider } from '@/services/graph/providers/surrealGraph.provider.js';
import { OpenRouterProvider } from '@/services/llm/providers/openrouter.provider.js';
import { SpeechService as SpeechServiceClass } from '@/services/speech/index.js';
import { StorageService as StorageServiceClass } from '@/storage/core/StorageService.js';
import { createStorageProvider } from '@/storage/core/storageFactory.js';
import type { Database } from '@/storage/providers/supabase/supabase.types.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/index.js';
import { RateLimiter } from '@/utils/security/rateLimiter.js';

/**
 * Registers core application services and values with the container.
 */
export const registerCoreServices = () => {
  const config = parseConfig();

  container.registerValue(AppConfig, config);
  container.registerValue(Logger, logger);

  // Supabase client — lazy singleton, resolved on first use
  container.registerSingleton(SupabaseAdminClient, () => {
    const cfg = container.resolve(AppConfig);
    if (!cfg.supabase?.url || !cfg.supabase?.serviceRoleKey) {
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'Supabase URL or service role key is missing for admin client.',
      );
    }
    return createClient<Database>(
      cfg.supabase.url,
      cfg.supabase.serviceRoleKey,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  });

  // SurrealDB client — lazy singleton with async connection
  container.registerSingleton(SurrealdbClient, () => {
    const cfg = container.resolve(AppConfig);
    if (
      !cfg.surrealdb?.url ||
      !cfg.surrealdb?.namespace ||
      !cfg.surrealdb?.database
    ) {
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'SurrealDB URL, namespace, and database are required for SurrealDB client.',
      );
    }

    const db = new Surreal();

    db.connect(cfg.surrealdb.url, {
      namespace: cfg.surrealdb.namespace,
      database: cfg.surrealdb.database,
      ...(cfg.surrealdb.username &&
        cfg.surrealdb.password && {
          auth: {
            username: cfg.surrealdb.username,
            password: cfg.surrealdb.password,
          },
        }),
    })
      .then(() => {
        logger.info('Connected to SurrealDB');
      })
      .catch((err: Error) => {
        logger.error('Failed to connect to SurrealDB', {
          requestId: 'surrealdb-init',
          timestamp: new Date().toISOString(),
          operation: 'SurrealDB.connect',
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return db;
  });

  // Storage provider — factory depends on AppConfig
  container.registerSingleton(StorageProvider, (c) =>
    createStorageProvider(c.resolve(AppConfig)),
  );

  // StorageService — singleton, receives provider via container
  container.registerSingleton(
    StorageService,
    (c) => new StorageServiceClass(c.resolve(StorageProvider)),
  );

  // LLM Provider
  container.registerSingleton(
    LlmProvider,
    (c) =>
      new OpenRouterProvider(
        c.resolve(RateLimiterService),
        c.resolve(AppConfig),
        c.resolve(Logger),
      ),
  );

  // RateLimiter — singleton
  container.registerSingleton(
    RateLimiterService,
    (c) => new RateLimiter(c.resolve(AppConfig), c.resolve(Logger)),
  );

  // SpeechService — configuration-driven factory
  container.registerSingleton(SpeechService, (c) => {
    const cfg = c.resolve(AppConfig);

    const ttsConfig =
      cfg.speech?.tts?.enabled && cfg.speech.tts.apiKey
        ? ({
            provider: 'elevenlabs',
            apiKey: cfg.speech.tts.apiKey,
            ...(cfg.speech.tts.baseUrl && {
              baseUrl: cfg.speech.tts.baseUrl,
            }),
            ...(cfg.speech.tts.defaultVoiceId && {
              defaultVoiceId: cfg.speech.tts.defaultVoiceId,
            }),
            ...(cfg.speech.tts.defaultModelId && {
              defaultModelId: cfg.speech.tts.defaultModelId,
            }),
            ...(cfg.speech.tts.timeout && {
              timeout: cfg.speech.tts.timeout,
            }),
          } as const)
        : undefined;

    const sttConfig =
      cfg.speech?.stt?.enabled && cfg.speech.stt.apiKey
        ? ({
            provider: 'openai-whisper',
            apiKey: cfg.speech.stt.apiKey,
            ...(cfg.speech.stt.baseUrl && {
              baseUrl: cfg.speech.stt.baseUrl,
            }),
            ...(cfg.speech.stt.defaultModelId && {
              defaultModelId: cfg.speech.stt.defaultModelId,
            }),
            ...(cfg.speech.stt.timeout && {
              timeout: cfg.speech.stt.timeout,
            }),
          } as const)
        : undefined;

    return new SpeechServiceClass(ttsConfig, sttConfig);
  });

  // GraphService — depends on SurrealDB
  container.registerSingleton(GraphService, (c) => {
    const surrealClient = c.resolve(SurrealdbClient);
    const graphProvider = new SurrealGraphProvider(surrealClient);
    return new GraphServiceClass(graphProvider);
  });

  logger.info('Core services registered with the DI container.');
};
