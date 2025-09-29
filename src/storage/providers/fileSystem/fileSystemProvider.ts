/**
 * @fileoverview A filesystem-based storage provider.
 * Persists data to the local filesystem in a specified directory.
 * Each key-value pair is stored as a separate JSON file.
 * @module src/storage/providers/fileSystem/fileSystemProvider
 */
import { existsSync, mkdirSync } from 'fs';
import { readFile, readdir, rm, writeFile } from 'fs/promises';
import path from 'path';

import type {
  IStorageProvider,
  StorageOptions,
  ListOptions,
  ListResult,
} from '@/storage/core/IStorageProvider.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import {
  ErrorHandler,
  sanitization,
  type RequestContext,
} from '@/utils/index.js';

const DEFAULT_LIST_LIMIT = 1000;

type FileEnvelope = {
  __mcp: { v: 1; expiresAt?: number };
  value: unknown;
};

const FILE_ENVELOPE_VERSION = 1;

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

  private getTenantPath(tenantId: string): string {
    const sanitizedTenantId = sanitization.sanitizePath(tenantId, {
      toPosix: true,
    }).sanitizedPath;
    if (sanitizedTenantId.includes('/') || sanitizedTenantId.includes('..')) {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'Invalid tenantId contains path characters.',
      );
    }
    const tenantPath = path.join(this.storagePath, sanitizedTenantId);
    if (!existsSync(tenantPath)) {
      mkdirSync(tenantPath, { recursive: true });
    }
    return tenantPath;
  }

  private getFilePath(tenantId: string, key: string): string {
    const tenantPath = this.getTenantPath(tenantId);
    const sanitizedKey = sanitization.sanitizePath(key, {
      rootDir: tenantPath,
      toPosix: true,
    }).sanitizedPath;
    const filePath = path.join(tenantPath, sanitizedKey);
    if (!path.resolve(filePath).startsWith(path.resolve(tenantPath))) {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'Invalid key results in path traversal attempt.',
      );
    }
    return filePath;
  }

  private buildEnvelope(
    value: unknown,
    options?: StorageOptions,
  ): FileEnvelope {
    const expiresAt = options?.ttl
      ? Date.now() + options.ttl * 1000
      : undefined;
    return {
      __mcp: { v: FILE_ENVELOPE_VERSION, ...(expiresAt ? { expiresAt } : {}) },
      value,
    };
  }

  private async parseAndValidate<T>(
    raw: string,
    tenantId: string,
    key: string,
    filePath: string,
    context: RequestContext,
  ): Promise<T | null> {
    try {
      const parsed: unknown = JSON.parse(raw);
      // Envelope-aware parsing
      if (parsed && typeof parsed === 'object' && '__mcp' in parsed) {
        const env = parsed as FileEnvelope;
        const expiresAt = env.__mcp?.expiresAt;
        if (expiresAt && Date.now() > expiresAt) {
          // Expired: best-effort delete and return null
          try {
            await rm(filePath);
          } catch {
            // ignore
          }
          return null;
        }
        return env.value as T;
      }
      // Legacy: return parsed directly
      return parsed as T;
    } catch (error) {
      throw new McpError(
        JsonRpcErrorCode.SerializationError,
        `Failed to parse stored JSON for key "${key}" (tenant "${tenantId}").`,
        { ...context, error },
      );
    }
  }

  async get<T>(
    tenantId: string,
    key: string,
    context: RequestContext,
  ): Promise<T | null> {
    const filePath = this.getFilePath(tenantId, key);
    return ErrorHandler.tryCatch(
      async () => {
        try {
          const data = await readFile(filePath, 'utf-8');
          return this.parseAndValidate<T>(
            data,
            tenantId,
            key,
            filePath,
            context,
          );
        } catch (error) {
          if (
            error instanceof Error &&
            'code' in error &&
            (error as { code: string }).code === 'ENOENT'
          ) {
            return null; // File not found
          }
          throw error; // Re-throw other errors
        }
      },
      {
        operation: 'FileSystemProvider.get',
        context,
        input: { tenantId, key },
      },
    );
  }

  async set(
    tenantId: string,
    key: string,
    value: unknown,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    const filePath = this.getFilePath(tenantId, key);
    return ErrorHandler.tryCatch(
      async () => {
        const envelope = this.buildEnvelope(value, options);
        const content = JSON.stringify(envelope, null, 2);
        mkdirSync(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, content, 'utf-8');
      },
      {
        operation: 'FileSystemProvider.set',
        context,
        input: { tenantId, key },
      },
    );
  }

  async delete(
    tenantId: string,
    key: string,
    context: RequestContext,
  ): Promise<boolean> {
    const filePath = this.getFilePath(tenantId, key);
    return ErrorHandler.tryCatch(
      async () => {
        try {
          await rm(filePath);
          return true;
        } catch (error) {
          if (
            error instanceof Error &&
            'code' in error &&
            (error as { code: string }).code === 'ENOENT'
          ) {
            return false; // File didn't exist
          }
          throw error;
        }
      },
      {
        operation: 'FileSystemProvider.delete',
        context,
        input: { tenantId, key },
      },
    );
  }

  private async listFilesRecursively(
    dir: string,
    baseDir: string,
  ): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await this.listFilesRecursively(fullPath, baseDir)));
      } else if (entry.isFile()) {
        const rel = path.relative(baseDir, fullPath);
        // Normalize to POSIX-style keys for consistency
        results.push(rel.split(path.sep).join('/'));
      }
    }
    return results;
  }

  async list(
    tenantId: string,
    prefix: string,
    context: RequestContext,
    options?: ListOptions,
  ): Promise<ListResult> {
    return ErrorHandler.tryCatch(
      async () => {
        const tenantPath = this.getTenantPath(tenantId);
        const allKeys = await this.listFilesRecursively(tenantPath, tenantPath);
        const candidateKeys = allKeys.filter((k) => k.startsWith(prefix));

        // TTL-aware filtering: best-effort; expensive on large stores.
        const validKeys: string[] = [];
        for (const k of candidateKeys) {
          const filePath = this.getFilePath(tenantId, k);
          try {
            const raw = await readFile(filePath, 'utf-8');
            const value = await this.parseAndValidate<unknown>(
              raw,
              tenantId,
              k,
              filePath,
              context,
            );
            if (value !== null) {
              validKeys.push(k);
            }
          } catch (_e) {
            // If parsing fails, exclude key and continue; error already typed/logged by tryCatch wrapper.
            continue;
          }
        }

        // Sort for consistent pagination
        validKeys.sort();

        // Apply pagination
        const limit = options?.limit ?? DEFAULT_LIST_LIMIT;
        let startIndex = 0;

        if (options?.cursor) {
          const cursorIndex = validKeys.indexOf(options.cursor);
          if (cursorIndex !== -1) {
            startIndex = cursorIndex + 1;
          }
        }

        const paginatedKeys = validKeys.slice(startIndex, startIndex + limit);
        const nextCursor =
          startIndex + limit < validKeys.length
            ? paginatedKeys[paginatedKeys.length - 1]
            : undefined;

        return {
          keys: paginatedKeys,
          nextCursor,
        };
      },
      {
        operation: 'FileSystemProvider.list',
        context,
        input: { tenantId, prefix },
      },
    );
  }

  async getMany<T>(
    tenantId: string,
    keys: string[],
    context: RequestContext,
  ): Promise<Map<string, T>> {
    return ErrorHandler.tryCatch(
      async () => {
        const results = new Map<string, T>();
        for (const key of keys) {
          const value = await this.get<T>(tenantId, key, context);
          if (value !== null) {
            results.set(key, value);
          }
        }
        return results;
      },
      {
        operation: 'FileSystemProvider.getMany',
        context,
        input: { tenantId, keyCount: keys.length },
      },
    );
  }

  async setMany(
    tenantId: string,
    entries: Map<string, unknown>,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    return ErrorHandler.tryCatch(
      async () => {
        for (const [key, value] of entries.entries()) {
          await this.set(tenantId, key, value, context, options);
        }
      },
      {
        operation: 'FileSystemProvider.setMany',
        context,
        input: { tenantId, entryCount: entries.size },
      },
    );
  }

  async deleteMany(
    tenantId: string,
    keys: string[],
    context: RequestContext,
  ): Promise<number> {
    return ErrorHandler.tryCatch(
      async () => {
        let deletedCount = 0;
        for (const key of keys) {
          const deleted = await this.delete(tenantId, key, context);
          if (deleted) {
            deletedCount++;
          }
        }
        return deletedCount;
      },
      {
        operation: 'FileSystemProvider.deleteMany',
        context,
        input: { tenantId, keyCount: keys.length },
      },
    );
  }

  async clear(tenantId: string, context: RequestContext): Promise<number> {
    return ErrorHandler.tryCatch(
      async () => {
        const tenantPath = this.getTenantPath(tenantId);
        const allKeys = await this.listFilesRecursively(tenantPath, tenantPath);
        let deletedCount = 0;
        for (const key of allKeys) {
          const deleted = await this.delete(tenantId, key, context);
          if (deleted) {
            deletedCount++;
          }
        }
        return deletedCount;
      },
      {
        operation: 'FileSystemProvider.clear',
        context,
        input: { tenantId },
      },
    );
  }
}
