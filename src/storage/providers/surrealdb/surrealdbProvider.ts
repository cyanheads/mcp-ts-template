/**
 * @fileoverview A SurrealDB-based storage provider.
 * Persists data to a specified table in a SurrealDB instance (local or cloud).
 * Assumes a table with columns: `tenant_id`, `key`, `value`, `expires_at`, `created_at`, `updated_at`.
 * @module src/storage/providers/surrealdb/surrealdbProvider
 */
import { inject, injectable } from 'tsyringe';
import Surreal from 'surrealdb';

import { SurrealdbClient } from '@/container/tokens.js';
import type {
  IStorageProvider,
  StorageOptions,
  ListOptions,
  ListResult,
} from '@/storage/core/IStorageProvider.js';
import type { KvStoreRecord } from '@/storage/providers/surrealdb/surrealdb.types.js';
import {
  encodeCursor,
  decodeCursor,
} from '@/storage/core/storageValidation.js';
import { ErrorHandler, type RequestContext, logger } from '@/utils/index.js';

const DEFAULT_LIST_LIMIT = 1000;

/**
 * SurrealDB-based storage provider implementation.
 *
 * Provides key-value storage using SurrealDB with support for:
 * - Multi-tenancy isolation via tenant_id
 * - TTL (time-to-live) with automatic expiration
 * - Batch operations (getMany, setMany, deleteMany)
 * - Cursor-based pagination
 *
 * @remarks
 * Uses UPDATE...MERGE for upserts to preserve created_at timestamps.
 * Expired entries are filtered on read and cleaned up asynchronously.
 */
@injectable()
export class SurrealdbProvider implements IStorageProvider {
  /**
   * Creates a new SurrealDB storage provider instance.
   *
   * @param client - The connected SurrealDB client instance (injected via DI)
   * @param tableName - The name of the table to use for storage (default: 'kv_store')
   *                    Must match the table defined in your SurrealDB schema
   */
  constructor(
    @inject(SurrealdbClient)
    private readonly client: Surreal,
    private readonly tableName: string = 'kv_store',
  ) {}

  private getClient() {
    return this.client;
  }

  async get<T>(
    tenantId: string,
    key: string,
    context: RequestContext,
  ): Promise<T | null> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = `
          SELECT value, expires_at
          FROM type::table($table)
          WHERE tenant_id = $tenant_id AND key = $key
          LIMIT 1
        `;

        const queryResult = await this.getClient().query<
          [{ result: KvStoreRecord[] }]
        >(query, {
          table: this.tableName,
          tenant_id: tenantId,
          key,
        });

        const data = queryResult[0]?.result;

        if (!data || data.length === 0) {
          return null;
        }

        const record = data[0];

        // Check expiration
        if (
          record?.expires_at &&
          new Date(record.expires_at).getTime() < Date.now()
        ) {
          await this.delete(tenantId, key, context);
          logger.debug(
            `[SurrealdbProvider] Key expired and removed: ${key} for tenant: ${tenantId}`,
            context,
          );
          return null;
        }

        return record?.value as T;
      },
      {
        operation: 'SurrealdbProvider.get',
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
    return ErrorHandler.tryCatch(
      async () => {
        // Fix: Check for undefined instead of truthy to handle ttl=0 correctly
        // Calculate expiration timestamp
        const expires_at =
          options?.ttl !== undefined
            ? new Date(Date.now() + options.ttl * 1000).toISOString()
            : null;

        // Use UPDATE...MERGE for upsert behavior to preserve created_at on updates
        // MERGE updates only specified fields, unlike CONTENT which replaces entire record
        // This ensures created_at is set only on initial creation, not on updates
        const query = `
          UPDATE type::table($table):[$tenant_id, $key] MERGE {
            tenant_id: $tenant_id,
            key: $key,
            value: $value,
            expires_at: $expires_at,
            created_at: $this.created_at ?? time::now(),
            updated_at: time::now()
          }
        `;

        await this.getClient().query(query, {
          table: this.tableName,
          tenant_id: tenantId,
          key,
          value,
          expires_at,
        });
      },
      {
        operation: 'SurrealdbProvider.set',
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
    return ErrorHandler.tryCatch(
      async () => {
        const query = `
          DELETE FROM type::table($table)
          WHERE tenant_id = $tenant_id AND key = $key
          RETURN BEFORE
        `;

        const queryResult = await this.getClient().query<
          [{ result: KvStoreRecord[] }]
        >(query, {
          table: this.tableName,
          tenant_id: tenantId,
          key,
        });

        const deleted = queryResult[0]?.result;
        return deleted !== undefined && deleted.length > 0;
      },
      {
        operation: 'SurrealdbProvider.delete',
        context,
        input: { tenantId, key },
      },
    );
  }

  async list(
    tenantId: string,
    prefix: string,
    context: RequestContext,
    options?: ListOptions,
  ): Promise<ListResult> {
    return ErrorHandler.tryCatch(
      async () => {
        const now = new Date().toISOString();
        const limit = options?.limit ?? DEFAULT_LIST_LIMIT;

        let query = `
          SELECT key
          FROM type::table($table)
          WHERE tenant_id = $tenant_id
            AND string::starts_with(key, $prefix)
            AND (expires_at IS NONE OR expires_at > type::datetime($now))
        `;

        // Apply cursor-based pagination
        if (options?.cursor) {
          // Decode cursor to validate it (the value is used in params below)
          decodeCursor(options.cursor, tenantId, context);
          query += ` AND key > $cursor`;
        }

        query += ` ORDER BY key ASC LIMIT $limit_plus_one`;

        const queryResult = await this.getClient().query<
          [{ result: Array<{ key: string }> }]
        >(query, {
          table: this.tableName,
          tenant_id: tenantId,
          prefix,
          now,
          cursor: options?.cursor
            ? decodeCursor(options.cursor, tenantId, context)
            : undefined,
          limit_plus_one: limit + 1, // Fetch one extra to determine if there are more results
        });

        const data = queryResult[0]?.result ?? [];
        const keys = data.map((item: { key: string }) => item.key);
        const hasMore = keys.length > limit;
        const resultKeys = hasMore ? keys.slice(0, limit) : keys;
        const lastKey = resultKeys[resultKeys.length - 1];
        const nextCursor =
          hasMore && lastKey ? encodeCursor(lastKey, tenantId) : undefined;

        return {
          keys: resultKeys,
          nextCursor,
        };
      },
      {
        operation: 'SurrealdbProvider.list',
        context,
        input: { tenantId, prefix, options },
      },
    );
  }

  async getMany<T>(
    tenantId: string,
    keys: string[],
    context: RequestContext,
  ): Promise<Map<string, T>> {
    return ErrorHandler.tryCatch<Map<string, T>>(
      async () => {
        if (keys.length === 0) {
          return new Map<string, T>();
        }

        const query = `
          SELECT key, value, expires_at
          FROM type::table($table)
          WHERE tenant_id = $tenant_id AND key INSIDE $keys
        `;

        const queryResult = await this.getClient().query<
          [{ result: KvStoreRecord[] }]
        >(query, {
          table: this.tableName,
          tenant_id: tenantId,
          keys,
        });

        const data = queryResult[0]?.result ?? [];

        const results = new Map<string, T>();
        const expiredKeys: string[] = [];

        for (const row of data) {
          if (
            !row.expires_at ||
            new Date(row.expires_at).getTime() >= Date.now()
          ) {
            results.set(row.key, row.value as T);
          } else {
            // Collect expired keys for batch deletion
            expiredKeys.push(row.key);
          }
        }

        // Clean up expired entries in a single batch operation
        if (expiredKeys.length > 0) {
          await this.deleteMany(tenantId, expiredKeys, context);
        }

        return results;
      },
      {
        operation: 'SurrealdbProvider.getMany',
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
        if (entries.size === 0) {
          return;
        }

        // Fix: Check for undefined instead of truthy to handle ttl=0 correctly
        // Calculate expiration timestamp
        const expires_at =
          options?.ttl !== undefined
            ? new Date(Date.now() + options.ttl * 1000).toISOString()
            : null;

        // Build batch upsert using multiple UPDATE statements in a single query
        // Using MERGE to preserve created_at on updates (see set() method for explanation)
        const updates = Array.from(entries.entries()).map((_entry, index) => {
          return `
            UPDATE type::table($table):[$tenant_id, $key_${index}] MERGE {
              tenant_id: $tenant_id,
              key: $key_${index},
              value: $value_${index},
              expires_at: $expires_at,
              created_at: $this.created_at ?? time::now(),
              updated_at: time::now()
            };
          `;
        });

        const query = updates.join('\n');

        // Build parameters object with indexed keys and values
        const params: Record<string, unknown> = {
          table: this.tableName,
          tenant_id: tenantId,
          expires_at,
        };

        Array.from(entries.entries()).forEach(([key, value], index) => {
          params[`key_${index}`] = key;
          params[`value_${index}`] = value;
        });

        await this.getClient().query(query, params);
      },
      {
        operation: 'SurrealdbProvider.setMany',
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
        if (keys.length === 0) {
          return 0;
        }

        const query = `
          DELETE FROM type::table($table)
          WHERE tenant_id = $tenant_id AND key INSIDE $keys
          RETURN BEFORE
        `;

        const queryResult = await this.getClient().query<
          [{ result: KvStoreRecord[] }]
        >(query, {
          table: this.tableName,
          tenant_id: tenantId,
          keys,
        });

        const deleted = queryResult[0]?.result ?? [];
        return deleted.length;
      },
      {
        operation: 'SurrealdbProvider.deleteMany',
        context,
        input: { tenantId, keyCount: keys.length },
      },
    );
  }

  async clear(tenantId: string, context: RequestContext): Promise<number> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = `
          DELETE FROM type::table($table)
          WHERE tenant_id = $tenant_id
          RETURN BEFORE
        `;

        const queryResult = await this.getClient().query<
          [{ result: KvStoreRecord[] }]
        >(query, {
          table: this.tableName,
          tenant_id: tenantId,
        });

        const count = queryResult[0]?.result?.length ?? 0;
        logger.info(
          `[SurrealdbProvider] Cleared ${count} keys for tenant: ${tenantId}`,
          context,
        );
        return count;
      },
      {
        operation: 'SurrealdbProvider.clear',
        context,
        input: { tenantId },
      },
    );
  }
}
