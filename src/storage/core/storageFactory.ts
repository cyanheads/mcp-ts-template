/**
 * @fileoverview Factory function for creating a storage provider based on application configuration.
 * This module decouples the application from concrete storage implementations, allowing the
 * storage backend to be selected via environment variables.
 * @module src/storage/storageFactory
 */
import type { ConfigSchema } from '@/config/index.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger, requestContextService } from '@/utils/index.js';
import { FileSystemProvider } from '@/storage/providers/fileSystem/fileSystemProvider.js';
import { InMemoryProvider } from '@/storage/providers/inMemory/inMemoryProvider.js';
import { SupabaseProvider } from '@/storage/providers/supabase/supabaseProvider.js';
import type { IStorageProvider } from '@/storage/core/IStorageProvider.js';

/**
 * Creates and returns a storage provider instance based on the provided configuration.
 *
 * @param config - The application configuration object, typically resolved
 *                 from the DI container.
 * @returns An instance of a class that implements the IStorageProvider interface.
 * @throws {McpError} If the configuration is missing required values for the
 *         selected provider.
 */
export function createStorageProvider(
  config: ReturnType<typeof ConfigSchema.parse>,
): IStorageProvider {
  const context = requestContextService.createRequestContext({
    operation: 'createStorageProvider',
  });
  const providerType = config.storage.providerType;

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
      // Note: The SupabaseProvider internally resolves the config from the DI container again.
      // This is a known pattern to avoid passing config details through multiple layers.
      return new SupabaseProvider();
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
