/**
 * @fileoverview A filesystem-based storage provider.
 * Persists data to the local filesystem in a specified directory.
 * Each key-value pair is stored as a separate JSON file.
 * @module src/storage/providers/fileSystem/fileSystemProvider
 */
import { existsSync, mkdirSync } from 'fs';
import { readFile, readdir, rm, writeFile } from 'fs/promises';
import path from 'path';

import type { IStorageProvider } from '@/storage/core/IStorageProvider.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { ErrorHandler, type RequestContext } from '@/utils/index.js';

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

  private getFilePath(key: string): string {
    const filePath = path.join(this.storagePath, key);
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
          return JSON.parse(data) as T;
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
  ): Promise<void> {
    const filePath = this.getFilePath(key);
    return ErrorHandler.tryCatch(
      async () => {
        const content =
          typeof value === 'string' ? value : JSON.stringify(value, null, 2);
        // Ensure the directory exists before writing the file
        mkdirSync(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, content, 'utf-8');
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
        return files.filter((file) => file.startsWith(prefix));
      },
      { operation: 'FileSystemProvider.list', context, input: { prefix } },
    );
  }
}
