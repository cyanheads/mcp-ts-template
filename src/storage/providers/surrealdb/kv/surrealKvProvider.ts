/**
 * @fileoverview SurrealDB key-value storage provider using modular base.
 * Implements IStorageProvider for multi-tenant KV operations.
 * @module src/storage/providers/surrealdb/kv/surrealKvProvider
 */

import { inject, injectable } from 'tsyringe';
import type Surreal from 'surrealdb';

import { SurrealdbClient } from '@/container/tokens.js';
import type {
  IStorageProvider,
  StorageOptions,
  ListOptions,
  ListResult,
} from '@/storage/core/IStorageProvider.js';
import {
  encodeCursor,
  decodeCursor,
} from '@/storage/core/storageValidation.js';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';
import type { KvStoreRecord, QueryResult } from '../types.js';
import { select } from '../core/queryBuilder.js';
import { TransactionManager } from '../core/transactionManager.js';

const DEFAULT_LIST_LIMIT = 1000;

/**
 * SurrealDB-based key-value storage provider.
 *
 * @remarks
 * Provides key-value storage using SurrealDB with support for:
 * - Multi-tenancy isolation via tenant_id
 * - TTL (time-to-live) with automatic expiration
 * - Batch operations (getMany, setMany, deleteMany)
 * - Cursor-based pagination
 * - Transaction support
 *
 * This provider uses composition with direct client injection for
 * improved modularity and testability.
 */
@injectable()
export class SurrealKvProvider implements IStorageProvider {
  private readonly tableName: string;
  private readonly client: Surreal;
  private readonly transactionManager: TransactionManager;

  constructor(
    @inject(SurrealdbClient) client: Surreal,
    tableName: string = 'kv_store',
  ) {
    this.client = client;
    this.tableName = tableName;
    this.transactionManager = new TransactionManager(this.client);
  }

  /**
   * Execute a raw query with parameters.
   *
   * @param query - The SurrealQL query string
   * @param params - Query parameters
   * @param context - Request context for logging
   * @returns Query result
   */
  private async executeQuery<T = unknown>(
    query: string,
    params: Record<string, unknown>,
    context: RequestContext,
  ): Promise<T[]> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.debug('[SurrealKvProvider] Executing query', {
          ...context,
          query: query.substring(0, 100),
        });

        const queryResult = await this.client.query<[QueryResult<T>]>(
          query,
          params,
        );

        return queryResult[0]?.result ?? [];
      },
      {
        operation: 'SurrealKvProvider.executeQuery',
        context,
        input: { query: query.substring(0, 50) },
      },
    );
  }

  /**
   * Check if a record has expired based on expires_at field.
   *
   * @param record - Record to check
   * @returns True if expired
   */
  private isExpired(record: KvStoreRecord): boolean {
    if (!record.expires_at) {
      return false;
    }
    return new Date(record.expires_at).getTime() < Date.now();
  }

  async get<T>(
    tenantId: string,
    key: string,
    context: RequestContext,
  ): Promise<T | null> {
    return ErrorHandler.tryCatch(
      async () => {
        const builder = select('value', 'expires_at')
          .from(this.tableName)
          .where((w) => w.equals('tenant_id', tenantId).equals('key', key))
          .limit(1);

        const { query, params } = builder.build();
        const data = await this.executeQuery<KvStoreRecord>(
          query,
          params,
          context,
        );

        if (!data || data.length === 0) {
          return null;
        }

        const record = data[0];

        if (!record) {
          return null;
        }

        // Check expiration
        if (this.isExpired(record)) {
          await this.delete(tenantId, key, context);
          logger.debug(
            `[SurrealKvProvider] Key expired and removed: ${key}`,
            context,
          );
          return null;
        }

        return record.value as T;
      },
      {
        operation: 'SurrealKvProvider.get',
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
        const expires_at =
          options?.ttl !== undefined
            ? new Date(Date.now() + options.ttl * 1000).toISOString()
            : null;

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

        await this.executeQuery(
          query,
          {
            table: this.tableName,
            tenant_id: tenantId,
            key,
            value,
            expires_at,
          },
          context,
        );
      },
      {
        operation: 'SurrealKvProvider.set',
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

        const result = await this.executeQuery<KvStoreRecord>(
          query,
          {
            table: this.tableName,
            tenant_id: tenantId,
            key,
          },
          context,
        );

        return result !== undefined && result.length > 0;
      },
      {
        operation: 'SurrealKvProvider.delete',
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

        if (options?.cursor) {
          decodeCursor(options.cursor, tenantId, context);
          query += ` AND key > $cursor`;
        }

        query += ` ORDER BY key ASC LIMIT $limit_plus_one`;

        const data = await this.executeQuery<{ key: string }>(
          query,
          {
            table: this.tableName,
            tenant_id: tenantId,
            prefix,
            now,
            cursor: options?.cursor
              ? decodeCursor(options.cursor, tenantId, context)
              : undefined,
            limit_plus_one: limit + 1,
          },
          context,
        );

        const keys = data.map((item) => item.key);
        const hasMore = keys.length > limit;
        const resultKeys = hasMore ? keys.slice(0, limit) : keys;
        const lastKey = resultKeys[resultKeys.length - 1];
        const nextCursor =
          hasMore && lastKey ? encodeCursor(lastKey, tenantId) : undefined;

        return { keys: resultKeys, nextCursor };
      },
      {
        operation: 'SurrealKvProvider.list',
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

        const data = await this.executeQuery<KvStoreRecord>(
          query,
          {
            table: this.tableName,
            tenant_id: tenantId,
            keys,
          },
          context,
        );

        const results = new Map<string, T>();
        const expiredKeys: string[] = [];

        for (const row of data) {
          if (!this.isExpired(row)) {
            results.set(row.key, row.value as T);
          } else {
            expiredKeys.push(row.key);
          }
        }

        if (expiredKeys.length > 0) {
          await this.deleteMany(tenantId, expiredKeys, context);
        }

        return results;
      },
      {
        operation: 'SurrealKvProvider.getMany',
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

        const expires_at =
          options?.ttl !== undefined
            ? new Date(Date.now() + options.ttl * 1000).toISOString()
            : null;

        await this.transactionManager.executeInTransaction(async (client) => {
          for (const [key, value] of entries) {
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

            await client.query(query, {
              table: this.tableName,
              tenant_id: tenantId,
              key,
              value,
              expires_at,
            });
          }
        }, context);
      },
      {
        operation: 'SurrealKvProvider.setMany',
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

        const deleted = await this.executeQuery<KvStoreRecord>(
          query,
          {
            table: this.tableName,
            tenant_id: tenantId,
            keys,
          },
          context,
        );

        return deleted.length;
      },
      {
        operation: 'SurrealKvProvider.deleteMany',
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

        const result = await this.executeQuery<KvStoreRecord>(
          query,
          {
            table: this.tableName,
            tenant_id: tenantId,
          },
          context,
        );

        const count = result.length;
        logger.info(
          `[SurrealKvProvider] Cleared ${count} keys for tenant: ${tenantId}`,
          context,
        );
        return count;
      },
      {
        operation: 'SurrealKvProvider.clear',
        context,
        input: { tenantId },
      },
    );
  }

  /**
   * Perform health check on the connection.
   *
   * @param context - Request context for logging
   * @returns Health check result
   */
  async healthCheck(context: RequestContext): Promise<boolean> {
    return ErrorHandler.tryCatch(
      async () => {
        try {
          // Simple ping query
          await this.client.query('SELECT 1 as ping');
          return true;
        } catch (_error) {
          return false;
        }
      },
      {
        operation: 'SurrealKvProvider.healthCheck',
        context,
      },
    );
  }
}
