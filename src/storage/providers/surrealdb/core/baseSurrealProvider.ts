/**
 * @fileoverview Base provider for SurrealDB with core query operations.
 * Provides foundation for all SurrealDB-based storage implementations.
 * @module src/storage/providers/surrealdb/core/baseSurrealProvider
 */

import type Surreal from 'surrealdb';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';
import type { KvStoreRecord, QueryResult } from '../types.js';
import { ConnectionManager } from './connectionManager.js';
import { TransactionManager } from './transactionManager.js';
import { SelectQueryBuilder } from './queryBuilder.js';

/**
 * Base provider for SurrealDB operations.
 *
 * @remarks
 * Provides common query patterns, connection management,
 * and transaction support for derived providers.
 */
export abstract class BaseSurrealProvider {
  protected connectionManager: ConnectionManager;
  protected transactionManager: TransactionManager;

  constructor(
    protected readonly client: Surreal,
    protected readonly tableName: string = 'kv_store',
  ) {
    this.connectionManager = new ConnectionManager(client);
    this.transactionManager = new TransactionManager(client);
  }

  /**
   * Get the SurrealDB client instance.
   */
  protected getClient(): Surreal {
    return this.connectionManager.getClient();
  }

  /**
   * Execute a raw query with parameters.
   *
   * @param query - The SurrealQL query string
   * @param params - Query parameters
   * @param context - Request context for logging
   * @returns Query result
   */
  protected async executeQuery<T = unknown>(
    query: string,
    params: Record<string, unknown>,
    context: RequestContext,
  ): Promise<T[]> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.debug('[BaseSurrealProvider] Executing query', {
          ...context,
          query: query.substring(0, 100),
        });

        const queryResult = await this.getClient().query<[QueryResult<T>]>(
          query,
          params,
        );

        return queryResult[0]?.result ?? [];
      },
      {
        operation: 'BaseSurrealProvider.executeQuery',
        context,
        input: { query: query.substring(0, 50) },
      },
    );
  }

  /**
   * Execute a SELECT query using the query builder.
   *
   * @param builder - Configured SELECT query builder
   * @param context - Request context for logging
   * @returns Array of selected records
   */
  protected async executeSelect<T = unknown>(
    builder: SelectQueryBuilder,
    context: RequestContext,
  ): Promise<T[]> {
    const { query, params } = builder.build();
    return this.executeQuery<T>(query, params, context);
  }

  /**
   * Check if a record exists.
   *
   * @param tenantId - Tenant identifier
   * @param key - Record key
   * @param context - Request context for logging
   * @returns True if record exists
   */
  protected async recordExists(
    tenantId: string,
    key: string,
    context: RequestContext,
  ): Promise<boolean> {
    const query = `
      SELECT count() as count
      FROM type::table($table)
      WHERE tenant_id = $tenant_id AND key = $key
    `;

    const result = await this.executeQuery<{ count: number }>(
      query,
      {
        table: this.tableName,
        tenant_id: tenantId,
        key,
      },
      context,
    );

    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Get the count of records matching criteria.
   *
   * @param tenantId - Tenant identifier
   * @param context - Request context for logging
   * @returns Count of records
   */
  protected async getRecordCount(
    tenantId: string,
    context: RequestContext,
  ): Promise<number> {
    const query = `
      SELECT count() as count
      FROM type::table($table)
      WHERE tenant_id = $tenant_id
    `;

    const result = await this.executeQuery<{ count: number }>(
      query,
      {
        table: this.tableName,
        tenant_id: tenantId,
      },
      context,
    );

    return result[0]?.count ?? 0;
  }

  /**
   * Execute operations within a transaction.
   *
   * @param callback - Transaction operations
   * @param context - Request context for logging
   * @returns Result of transaction
   */
  protected async withTransaction<T>(
    callback: (client: Surreal) => Promise<T>,
    context: RequestContext,
  ): Promise<T> {
    return this.transactionManager.executeInTransaction(callback, context);
  }

  /**
   * Check if a record has expired based on expires_at field.
   *
   * @param record - Record to check
   * @returns True if expired
   */
  protected isExpired(record: KvStoreRecord): boolean {
    if (!record.expires_at) {
      return false;
    }

    return new Date(record.expires_at).getTime() < Date.now();
  }

  /**
   * Perform health check on the connection.
   *
   * @param context - Request context for logging
   * @returns Health check result
   */
  async healthCheck(context: RequestContext): Promise<boolean> {
    const result = await this.connectionManager.healthCheck(context);
    return result.healthy;
  }
}
