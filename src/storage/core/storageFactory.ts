/**
 * @fileoverview Factory function for creating a storage provider based on application configuration.
 * This module decouples the application from concrete storage implementations, allowing the
 * storage backend to be selected via environment variables.
 * @module src/storage/storageFactory
 */
import { config } from '../../config/index.js';
import { JsonRpcErrorCode, McpError } from '../../types-global/errors.js';
import { logger, requestContextService } from '../../utils/index.js';
import { FileSystemProvider } from '../providers/fileSystem/fileSystemProvider.js';
import { InMemoryProvider } from '../providers/inMemory/inMemoryProvider.js';
import { SupabaseProvider } from '../providers/supabase/supabaseProvider.js';
import { IStorageProvider } from './IStorageProvider.js';

export function createStorageProvider(): IStorageProvider {
  const context = requestContextService.createRequestContext({
    operation: 'createStorageProvider',
  });
  const providerType = config.storage.providerType;

  if (!providerType) {
    // This should not happen if the Zod default is working, but it satisfies TS and is a good safeguard.
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      `Storage provider type is not defined. Check your environment configuration.`,
      context,
    );
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
      return new SupabaseProvider();
    default: {
      // This code is unreachable if the Zod schema has a default value,
      // but it's good practice for exhaustiveness checking.
      const exhaustiveCheck: never = providerType;
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        `Unhandled storage provider type: ${exhaustiveCheck}`,
        context,
      );
    }
  }
}
