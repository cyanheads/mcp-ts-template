/**
 * @fileoverview A filesystem-based storage provider.
 * Persists data to the local filesystem in a specified directory.
 * Each key-value pair is stored as a separate JSON file.
 * @module src/storage/providers/fileSystem/fileSystemProvider
 */
import { existsSync, mkdirSync } from 'fs';
import { readFile, readdir, rm, writeFile } from 'fs/promises';
import path from 'path';

import { JsonRpcErrorCode, McpError } from '../../../types-global/errors.js';
import { ErrorHandler, RequestContext, logger } from '../../../utils/index.js';
import type {
  IStorageProvider,
  StorageOptions,
} from '../../core/IStorageProvider.js';

interface FileStoreEntry {
  value: unknown;
  expiresAt?: number;
}

export class FileSystemProvider implements IStorageProvider {
  private readonly storagePath: string;

  constructor(storagePath: string) {
    if (!storagePath) {
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'FileSystemProvider requires a valid storagePath.',
      );
    }
    this.storagePath = path.resolve(storagePath);
    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }
  }

  private sanitizeKey(key: string): string {
    // Use Base64 URL-safe encoding for robustness to prevent collisions.
    return Buffer.from(key).toString('base64url');
  }

  private getFilePath(key: string): string {
    const sanitizedKey = this.sanitizeKey(key);
    const filePath = path.join(this.storagePath, `${sanitizedKey}.json`);
    // Final check to ensure it's within the storage path
    if (!path.resolve(filePath).startsWith(this.storagePath)) {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'Invalid key results in path traversal attempt.',
      );
    }
    return filePath;
  }

  async get<T>(key: string, context: RequestContext): Promise<T | null> {
    const filePath = this.getFilePath(key);
    return ErrorHandler.tryCatch(
      async () => {
        try {
          const data = await readFile(filePath, 'utf-8');
          const entry = JSON.parse(data) as FileStoreEntry;

          if (entry.expiresAt && Date.now() > entry.expiresAt) {
            await this.delete(key, context);
            logger.debug(
              `[FileSystemProvider] Key expired and removed: ${key}`,
              context,
            );
            return null;
          }
          return entry.value as T;
        } catch (error) {
          if (
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
          ) {
            return null; // File not found
          }
          throw error; // Re-throw other errors
        }
      },
      { operation: 'FileSystemProvider.get', context, input: { key } },
    );
  }

  async set(
    key: string,
    value: unknown,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    const filePath = this.getFilePath(key);
    return ErrorHandler.tryCatch(
      async () => {
        const expiresAt = options?.ttl
          ? Date.now() + options.ttl * 1000
          : undefined;
        const entry: FileStoreEntry = {
          value,
          ...(expiresAt && { expiresAt }),
        };
        await writeFile(filePath, JSON.stringify(entry), 'utf-8');
      },
      { operation: 'FileSystemProvider.set', context, input: { key } },
    );
  }

  async delete(key: string, context: RequestContext): Promise<boolean> {
    const filePath = this.getFilePath(key);
    return ErrorHandler.tryCatch(
      async () => {
        try {
          await rm(filePath);
          return true;
        } catch (error) {
          if (
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
          ) {
            return false; // File didn't exist
          }
          throw error;
        }
      },
      { operation: 'FileSystemProvider.delete', context, input: { key } },
    );
  }

  async list(prefix: string, context: RequestContext): Promise<string[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const files = await readdir(this.storagePath);
        const keys: string[] = [];
        for (const file of files) {
          if (file.endsWith('.json')) {
            const originalKey = Buffer.from(
              file.slice(0, -5),
              'base64url',
            ).toString('utf8');
            if (originalKey.startsWith(prefix)) {
              // Check for expiration before adding to the list
              const value = await this.get(originalKey, context);
              if (value !== null) {
                keys.push(originalKey);
              }
            }
          }
        }
        return keys;
      },
      { operation: 'FileSystemProvider.list', context, input: { prefix } },
    );
  }
}
