/**
 * @fileoverview Registers core application services with the DI container.
 * This module encapsulates the registration of fundamental services such as
 * configuration, logging, storage, and the LLM provider.
 * @module src/container/registrations/core
 */
import { createClient } from '@supabase/supabase-js';

import { parseConfig } from '@/config/index.js';
import { container } from '@/container/core/container.js';
import {
  AppConfig,
  LlmProvider,
  Logger,
  RateLimiterService,
  SpeechService,
  StorageProvider,
  StorageService,
  SupabaseAdminClient,
} from '@/container/core/tokens.js';
import { OpenRouterProvider } from '@/services/llm/providers/openrouter.provider.js';
import { SpeechService as SpeechServiceClass } from '@/services/speech/index.js';
import { StorageService as StorageServiceClass } from '@/storage/core/StorageService.js';
import {
  createStorageProvider,
  type StorageFactoryDeps,
} from '@/storage/core/storageFactory.js';
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
  container.registerSingleton(SupabaseAdminClient, (c) => {
    const cfg = c.resolve(AppConfig);
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

  // Storage provider — resolve DB clients here so storageFactory stays DI-agnostic
  container.registerSingleton(StorageProvider, (c) => {
    const cfg = c.resolve(AppConfig);
    const pt = cfg.storage.providerType;
    const deps: StorageFactoryDeps = {
      ...(pt === 'supabase' && {
        supabaseClient: c.resolve(SupabaseAdminClient),
      }),
    };
    return createStorageProvider(cfg, deps);
  });

  // StorageService — singleton, receives provider via container
  container.registerSingleton(
    StorageService,
    (c) => new StorageServiceClass(c.resolve(StorageProvider)),
  );

  // RateLimiter — registered before LlmProvider (which depends on it)
  container.registerSingleton(
    RateLimiterService,
    (c) => new RateLimiter(c.resolve(AppConfig), c.resolve(Logger)),
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

  logger.info('Core services registered with the DI container.');
};
