/**
 * @fileoverview Implements the IStorageProvider interface for Cloudflare KV.
 * @module src/storage/providers/cloudflare/kvProvider
 */
import type { KVNamespace } from '@cloudflare/workers-types';

import type {
  IStorageProvider,
  StorageOptions,
} from '@/storage/core/IStorageProvider.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';

export class KvProvider implements IStorageProvider {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  private getKvKey(tenantId: string, key: string): string {
    return `${tenantId}:${key}`;
  }

  async get<T>(
    tenantId: string,
    key: string,
    context: RequestContext,
  ): Promise<T | null> {
    const kvKey = this.getKvKey(tenantId, key);
    return ErrorHandler.tryCatch(
      async () => {
        logger.debug(`[KvProvider] Getting key: ${kvKey}`, context);
        try {
          const result = await this.kv.get<T>(kvKey, 'json');
          return result; // null indicates not found
        } catch (error) {
          throw new McpError(
            JsonRpcErrorCode.SerializationError,
            `[KvProvider] Failed to parse JSON for key: ${kvKey}`,
            { ...context, error },
          );
        }
      },
      {
        operation: 'KvProvider.get',
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
    const kvKey = this.getKvKey(tenantId, key);
    return ErrorHandler.tryCatch(
      async () => {
        logger.debug(`[KvProvider] Setting key: ${kvKey}`, {
          ...context,
          options,
        });
        const valueToStore = JSON.stringify(value);

        const putOptions: import('@cloudflare/workers-types').KVNamespacePutOptions =
          {};
        if (options?.ttl) {
          putOptions.expirationTtl = options.ttl;
        }

        await this.kv.put(kvKey, valueToStore, putOptions);
        logger.debug(`[KvProvider] Successfully set key: ${kvKey}`, context);
      },
      {
        operation: 'KvProvider.set',
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
    const kvKey = this.getKvKey(tenantId, key);
    return ErrorHandler.tryCatch(
      async () => {
        logger.debug(`[KvProvider] Deleting key: ${kvKey}`, context);

        const value = await this.kv.get(kvKey);
        if (value === null) {
          logger.debug(
            `[KvProvider] Key to delete not found: ${kvKey}`,
            context,
          );
          return false;
        }

        await this.kv.delete(kvKey);
        logger.debug(
          `[KvProvider] Successfully deleted key: ${kvKey}`,
          context,
        );
        return true;
      },
      {
        operation: 'KvProvider.delete',
        context,
        input: { tenantId, key },
      },
    );
  }

  async list(
    tenantId: string,
    prefix: string,
    context: RequestContext,
  ): Promise<string[]> {
    const kvPrefix = this.getKvKey(tenantId, prefix);
    return ErrorHandler.tryCatch(
      async () => {
        logger.debug(
          `[KvProvider] Listing keys with prefix: ${kvPrefix}`,
          context,
        );

        const listed = await this.kv.list({ prefix: kvPrefix });
        const tenantPrefix = `${tenantId}:`;
        const keys = listed.keys.map((keyInfo) =>
          keyInfo.name.startsWith(tenantPrefix)
            ? keyInfo.name.substring(tenantPrefix.length)
            : keyInfo.name,
        );

        logger.debug(
          `[KvProvider] Found ${keys.length} keys with prefix: ${kvPrefix}`,
          context,
        );

        return keys;
      },
      {
        operation: 'KvProvider.list',
        context,
        input: { tenantId, prefix },
      },
    );
  }
}
