/**
 * @fileoverview Transaction manager for SurrealDB operations.
 * Provides transaction support for multi-operation atomic updates.
 * @module src/storage/providers/surrealdb/core/transactionManager
 */

import type Surreal from 'surrealdb';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';
import type { TransactionOptions } from '../types.js';

/**
 * Callback function type for transaction operations.
 */
export type TransactionCallback<T> = (client: Surreal) => Promise<T>;

/**
 * Manages transactions for SurrealDB operations.
 *
 * @remarks
 * SurrealDB transactions are handled at the query level using
 * BEGIN TRANSACTION, COMMIT TRANSACTION, and CANCEL TRANSACTION.
 * This manager provides a convenient API for transaction lifecycle.
 */
export class TransactionManager {
  constructor(private readonly client: Surreal) {}

  /**
   * Execute a callback within a transaction.
   *
   * @param callback - The operations to execute within the transaction
   * @param context - Request context for logging
   * @param options - Transaction options
   * @returns The result of the callback
   *
   * @example
   * ```ts
   * const result = await txManager.executeInTransaction(
   *   async (client) => {
   *     await client.query('UPDATE account SET balance -= 100 WHERE id = $from', { from: 'alice' });
   *     await client.query('UPDATE account SET balance += 100 WHERE id = $to', { to: 'bob' });
   *     return 'success';
   *   },
   *   context
   * );
   * ```
   */
  async executeInTransaction<T>(
    callback: TransactionCallback<T>,
    context: RequestContext,
    options?: TransactionOptions,
  ): Promise<T> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.debug('[TransactionManager] Starting transaction', context);

        // Begin transaction
        await this.client.query('BEGIN TRANSACTION');

        try {
          // Execute callback operations
          const result = await Promise.race([
            callback(this.client),
            this.createTimeout(options?.timeout),
          ]);

          // Commit transaction
          await this.client.query('COMMIT TRANSACTION');

          logger.debug('[TransactionManager] Transaction committed', context);

          return result as T;
        } catch (error: unknown) {
          // Cancel transaction on error
          logger.warning(
            '[TransactionManager] Transaction failed, cancelling',
            context,
          );

          await this.client.query('CANCEL TRANSACTION');

          throw error;
        }
      },
      {
        operation: 'TransactionManager.executeInTransaction',
        context,
        input: { timeout: options?.timeout },
      },
    );
  }

  /**
   * Execute multiple queries in a single batch within a transaction.
   *
   * @param queries - Array of queries to execute
   * @param context - Request context for logging
   * @returns Array of results from each query
   */
  async executeBatch<T = unknown>(
    queries: Array<{ query: string; params?: Record<string, unknown> }>,
    context: RequestContext,
  ): Promise<T[]> {
    return this.executeInTransaction(async (client) => {
      const results: T[] = [];

      for (const { query, params } of queries) {
        const result = await client.query<[{ result: T }]>(query, params ?? {});
        results.push(result[0]?.result);
      }

      return results;
    }, context);
  }

  /**
   * Create a timeout promise for transaction timeout.
   */
  private createTimeout(timeout?: number): Promise<never> {
    if (!timeout) {
      return new Promise(() => {
        /* never resolves */
      });
    }

    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Transaction timeout after ${timeout}ms`));
      }, timeout);
    });
  }
}
