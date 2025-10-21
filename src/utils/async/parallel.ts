/**
 * @fileoverview Parallel execution utility with concurrency control.
 * @module src/utils/async/parallel
 */
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

/**
 * Options for parallel execution.
 */
export interface ParallelOptions {
  /** Maximum number of tasks to run concurrently. Default: Infinity (all at once) */
  concurrency?: number;
  /** Whether to stop execution on first error. Default: false (collect all errors) */
  stopOnError?: boolean;
}

/**
 * Executes an array of async tasks in parallel with optional concurrency control.
 * Returns results in the same order as the input tasks.
 *
 * @param tasks - Array of functions that return promises
 * @param options - Execution options
 * @returns Array of results in the same order as input tasks
 * @throws {McpError} If any task fails and stopOnError is true, or if all tasks complete with errors
 *
 * @example
 * ```typescript
 * // Run all tasks at once
 * const results = await parallel([
 *   () => fetchUser(1),
 *   () => fetchUser(2),
 *   () => fetchUser(3),
 * ]);
 *
 * // Limit to 2 concurrent tasks
 * const results = await parallel(
 *   [
 *     () => fetchUser(1),
 *     () => fetchUser(2),
 *     () => fetchUser(3),
 *     () => fetchUser(4),
 *   ],
 *   { concurrency: 2 }
 * );
 * ```
 */
export async function parallel<T>(
  tasks: Array<() => Promise<T>>,
  options: ParallelOptions = {},
): Promise<T[]> {
  const { concurrency = Infinity, stopOnError = false } = options;

  if (concurrency < 1) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Concurrency must be at least 1',
      { concurrency },
    );
  }

  if (tasks.length === 0) {
    return [];
  }

  // If no concurrency limit or concurrency >= task count, run all at once
  if (concurrency >= tasks.length) {
    if (stopOnError) {
      return await Promise.all(tasks.map((task) => task()));
    } else {
      const results = await Promise.allSettled(tasks.map((task) => task()));
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          throw new McpError(
            JsonRpcErrorCode.InternalError,
            `Task ${index} failed`,
            { error: String(result.reason) },
          );
        }
      });
    }
  }

  // Run with concurrency control
  const results: T[] = new Array(tasks.length) as T[];
  const errors: Array<{ index: number; error: unknown }> = [];
  let currentIndex = 0;

  async function runNext(): Promise<void> {
    while (currentIndex < tasks.length) {
      const index = currentIndex++;
      const task = tasks[index];

      if (!task) continue;

      try {
        results[index] = await task();
      } catch (error: unknown) {
        if (stopOnError) {
          throw error;
        }
        errors.push({ index, error });
      }
    }
  }

  // Create worker promises up to concurrency limit
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () =>
    runNext(),
  );

  await Promise.all(workers);

  // If there were any errors and stopOnError is false, throw aggregate error
  if (errors.length > 0 && !stopOnError) {
    throw new McpError(
      JsonRpcErrorCode.InternalError,
      `${errors.length} task(s) failed`,
      {
        failedCount: errors.length,
        totalCount: tasks.length,
        errors: errors.map((e) => ({
          index: e.index,
          error: e.error instanceof Error ? e.error.message : String(e.error),
        })),
      },
    );
  }

  return results;
}

/**
 * Executes tasks in batches with a specified batch size.
 * All tasks in a batch run concurrently, but batches run sequentially.
 *
 * @param tasks - Array of functions that return promises
 * @param batchSize - Number of tasks to run in each batch
 * @returns Array of results in the same order as input tasks
 *
 * @example
 * ```typescript
 * // Process 100 users in batches of 10
 * const results = await parallelBatches(
 *   userIds.map(id => () => fetchUser(id)),
 *   10
 * );
 * ```
 */
export async function parallelBatches<T>(
  tasks: Array<() => Promise<T>>,
  batchSize: number,
): Promise<T[]> {
  if (batchSize < 1) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Batch size must be at least 1',
      { batchSize },
    );
  }

  const results: T[] = [];

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((task) => task()));
    results.push(...batchResults);
  }

  return results;
}
