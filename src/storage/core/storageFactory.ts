/**
 * @fileoverview Factory function for creating a storage provider based on application configuration.
 * This module decouples the application from concrete storage implementations, allowing the
 * storage backend to be selected via environment variables. In a serverless environment,
 * it defaults to `in-memory` to ensure compatibility.
 * @module src/storage/core/storageFactory
 */
import { container } from 'tsyringe';
import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { AppConfig } from '@/config/index.js';
import type { Database } from '@/storage/providers/supabase/supabase.types.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import type { IStorageProvider } from '@/storage/core/IStorageProvider.js';
import { FileSystemProvider } from '@/storage/providers/fileSystem/fileSystemProvider.js';
import { InMemoryProvider } from '@/storage/providers/inMemory/inMemoryProvider.js';
import { SupabaseProvider } from '@/storage/providers/supabase/supabaseProvider.js';
import { R2Provider } from '@/storage/providers/cloudflare/r2Provider.js';
import { KvProvider } from '@/storage/providers/cloudflare/kvProvider.js';
import { logger, requestContextService } from '@/utils/index.js';

const isServerless =
  typeof process === 'undefined' || process.env.IS_SERVERLESS === 'true';

export interface StorageFactoryDeps {
  supabaseClient?: SupabaseClient<Database>;
  r2Bucket?: R2Bucket;
  kvNamespace?: KVNamespace;
}

/**
 * Creates and returns a storage provider instance based on the provided configuration.
 *
 * @param config - The application configuration object, typically resolved
 *                 from the DI container.
 * @param deps - Optional object containing pre-resolved dependencies for providers.
 * @returns An instance of a class that implements the IStorageProvider interface.
 * @throws {McpError} If the configuration is missing required values for the
 *         selected provider.
 */
export function createStorageProvider(
  config: AppConfig,
  deps: StorageFactoryDeps = {},
): IStorageProvider {
  const context = requestContextService.createRequestContext({
    operation: 'createStorageProvider',
  });

  const providerType = config.storage.providerType;

  if (
    isServerless &&
    !['in-memory', 'cloudflare-r2', 'cloudflare-kv'].includes(providerType)
  ) {
    logger.warning(
      `Forcing 'in-memory' storage provider in serverless environment (configured: ${providerType}).`,
      context,
    );
    return new InMemoryProvider();
  }

  logger.info(`Creating storage provider of type: ${providerType}`, context);

  switch (providerType) {
    case 'in-memory':
      return new InMemoryProvider();
    case 'filesystem':
      if (!config.storage.filesystemPath) {
        throw new McpError(
          JsonRpcErrorCode.ConfigurationError,
          'STORAGE_FILESYSTEM_PATH must be set for the filesystem storage provider.',
          context,
        );
      }
      return new FileSystemProvider(config.storage.filesystemPath);
    case 'supabase':
      if (!config.supabase?.url || !config.supabase?.serviceRoleKey) {
        throw new McpError(
          JsonRpcErrorCode.ConfigurationError,
          'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for the supabase storage provider.',
          context,
        );
      }
      if (deps.supabaseClient) {
        return new SupabaseProvider(deps.supabaseClient);
      }
      // Fallback to DI container (backward-compatible)
      return container.resolve(SupabaseProvider);
    case 'cloudflare-r2':
      if (isServerless) {
        const bucket =
          deps.r2Bucket ??
          (globalThis as unknown as { R2_BUCKET: R2Bucket }).R2_BUCKET;
        return new R2Provider(bucket);
      }
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'Cloudflare R2 storage is only available in a Cloudflare Worker environment.',
        context,
      );
    case 'cloudflare-kv':
      if (isServerless) {
        const kv =
          deps.kvNamespace ??
          (globalThis as unknown as { KV_NAMESPACE: KVNamespace }).KV_NAMESPACE;
        return new KvProvider(kv);
      }
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'Cloudflare KV storage is only available in a Cloudflare Worker environment.',
        context,
      );
    default: {
      const exhaustiveCheck: never = providerType;
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        `Unhandled storage provider type: ${String(exhaustiveCheck)}`,
        context,
      );
    }
  }
}
