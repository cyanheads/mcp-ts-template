/**
 * @fileoverview Factory function for creating a storage provider based on application configuration.
 * This module decouples the application from concrete storage implementations, allowing the
 * storage backend to be selected via environment variables. In a serverless environment,
 * it defaults to `in-memory` to ensure compatibility.
 * @module src/storage/core/storageFactory
 */
import { container } from 'tsyringe';
import type {
  R2Bucket,
  KVNamespace,
  D1Database,
} from '@cloudflare/workers-types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type Surreal from 'surrealdb';

import type { AppConfig } from '@/config/index.js';
import type { Database } from '@/storage/providers/supabase/supabase.types.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import type { IStorageProvider } from '@/storage/core/IStorageProvider.js';
import { FileSystemProvider } from '@/storage/providers/fileSystem/fileSystemProvider.js';
import { InMemoryProvider } from '@/storage/providers/inMemory/inMemoryProvider.js';
import { SupabaseProvider } from '@/storage/providers/supabase/supabaseProvider.js';
import { SurrealKvProvider } from '@/storage/providers/surrealdb/kv/surrealKvProvider.js';
import { R2Provider } from '@/storage/providers/cloudflare/r2Provider.js';
import { KvProvider } from '@/storage/providers/cloudflare/kvProvider.js';
import { D1Provider } from '@/storage/providers/cloudflare/d1Provider.js';
import { logger, requestContextService } from '@/utils/index.js';

const isServerless =
  typeof process === 'undefined' || process.env.IS_SERVERLESS === 'true';

/**
 * Optional dependencies for storage provider creation.
 * Allows pre-resolved dependencies to be passed in, useful for testing
 * and Worker environments where DI container may not be available.
 */
export interface StorageFactoryDeps {
  /** Pre-configured Supabase client */
  readonly supabaseClient?: SupabaseClient<Database>;
  /** Pre-configured SurrealDB client */
  readonly surrealdbClient?: Surreal;
  /** Cloudflare R2 bucket binding */
  readonly r2Bucket?: R2Bucket;
  /** Cloudflare KV namespace binding */
  readonly kvNamespace?: KVNamespace;
  /** Cloudflare D1 database binding */
  readonly d1Database?: D1Database;
}

/**
 * Creates and returns a storage provider instance based on the provided configuration.
 *
 * This factory decouples the application from concrete storage implementations,
 * allowing the backend to be selected via environment configuration. In serverless
 * environments, automatically falls back to in-memory storage for non-compatible providers.
 *
 * Provider Selection Logic:
 * - Serverless environment: Only `in-memory`, `cloudflare-r2`, `cloudflare-kv` allowed
 * - Node environment: All providers available
 * - Missing config: Throws ConfigurationError
 *
 * @param config - The application configuration object, typically resolved from DI container.
 * @param deps - Optional pre-resolved dependencies for providers (useful for testing/Workers).
 * @returns An instance of a class that implements the IStorageProvider interface.
 *
 * @throws {McpError} JsonRpcErrorCode.ConfigurationError - If:
 *   - filesystem provider selected but STORAGE_FILESYSTEM_PATH not set
 *   - supabase provider selected but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set
 *   - cloudflare-r2 provider selected in non-serverless environment
 *   - cloudflare-kv provider selected in non-serverless environment
 *   - unknown provider type specified
 *
 * @example
 * ```typescript
 * // Standard usage via DI
 * const config = container.resolve<AppConfig>(AppConfig);
 * const provider = createStorageProvider(config);
 *
 * // Worker usage with pre-resolved bindings
 * const provider = createStorageProvider(config, {
 *   r2Bucket: env.R2_BUCKET,
 *   kvNamespace: env.KV_NAMESPACE
 * });
 * ```
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
    ![
      'in-memory',
      'surrealdb',
      'cloudflare-r2',
      'cloudflare-kv',
      'cloudflare-d1',
    ].includes(providerType)
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
    case 'surrealdb':
      if (
        !config.surrealdb?.url ||
        !config.surrealdb?.namespace ||
        !config.surrealdb?.database
      ) {
        throw new McpError(
          JsonRpcErrorCode.ConfigurationError,
          'SURREALDB_URL, SURREALDB_NAMESPACE, and SURREALDB_DATABASE must be set for the surrealdb storage provider.',
          context,
        );
      }
      if (deps.surrealdbClient) {
        return new SurrealKvProvider(
          deps.surrealdbClient,
          config.surrealdb.tableName,
        );
      }
      // Fallback to DI container
      return container.resolve(SurrealKvProvider);
    case 'cloudflare-r2':
      if (isServerless) {
        if (deps.r2Bucket) {
          return new R2Provider(deps.r2Bucket);
        }

        // Type guard to check if globalThis has R2_BUCKET binding
        function hasR2Bucket(obj: unknown): obj is { R2_BUCKET: R2Bucket } {
          return typeof obj === 'object' && obj !== null && 'R2_BUCKET' in obj;
        }

        const globalWithBinding: unknown = globalThis;
        if (!hasR2Bucket(globalWithBinding)) {
          throw new McpError(
            JsonRpcErrorCode.ConfigurationError,
            'R2_BUCKET binding not available in globalThis. Ensure wrangler.toml is configured correctly.',
            context,
          );
        }

        // After type guard, globalWithBinding is narrowed to { R2_BUCKET: R2Bucket }
        return new R2Provider(globalWithBinding.R2_BUCKET);
      }
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'Cloudflare R2 storage is only available in a Cloudflare Worker environment.',
        context,
      );
    case 'cloudflare-kv':
      if (isServerless) {
        if (deps.kvNamespace) {
          return new KvProvider(deps.kvNamespace);
        }

        // Type guard to check if globalThis has KV_NAMESPACE binding
        function hasKVNamespace(
          obj: unknown,
        ): obj is { KV_NAMESPACE: KVNamespace } {
          return (
            typeof obj === 'object' && obj !== null && 'KV_NAMESPACE' in obj
          );
        }

        const globalWithBinding: unknown = globalThis;
        if (!hasKVNamespace(globalWithBinding)) {
          throw new McpError(
            JsonRpcErrorCode.ConfigurationError,
            'KV_NAMESPACE binding not available in globalThis. Ensure wrangler.toml is configured correctly.',
            context,
          );
        }

        // After type guard, globalWithBinding is narrowed to { KV_NAMESPACE: KVNamespace }
        return new KvProvider(globalWithBinding.KV_NAMESPACE);
      }
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'Cloudflare KV storage is only available in a Cloudflare Worker environment.',
        context,
      );
    case 'cloudflare-d1':
      if (isServerless) {
        if (deps.d1Database) {
          return new D1Provider(deps.d1Database);
        }

        // Type guard to check if globalThis has DB binding
        function hasD1Database(obj: unknown): obj is { DB: D1Database } {
          return typeof obj === 'object' && obj !== null && 'DB' in obj;
        }

        const globalWithBinding: unknown = globalThis;
        if (!hasD1Database(globalWithBinding)) {
          throw new McpError(
            JsonRpcErrorCode.ConfigurationError,
            'DB binding not available in globalThis. Ensure wrangler.toml is configured correctly with D1 database binding.',
            context,
          );
        }

        // After type guard, globalWithBinding is narrowed to { DB: D1Database }
        return new D1Provider(globalWithBinding.DB);
      }
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'Cloudflare D1 storage is only available in a Cloudflare Worker environment.',
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
