/**
 * @fileoverview Timeout utility for async operations.
 * @module src/utils/async/timeout
 */
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within the specified time,
 * it rejects with a timeout error.
 *
 * @param promise - The promise to wrap with a timeout
 * @param timeoutMs - Timeout duration in milliseconds
 * @param timeoutMessage - Custom error message for timeout. Default: "Operation timed out"
 * @returns The result of the promise if it resolves in time
 * @throws {McpError} If the operation times out
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   fetchData(),
 *   5000,
 *   'Data fetch timed out after 5 seconds'
 * );
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out',
): Promise<T> {
  if (timeoutMs <= 0) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Timeout must be greater than 0',
      { timeoutMs },
    );
  }

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new McpError(
          JsonRpcErrorCode.InternalError,
          timeoutMessage,
          { timeoutMs },
        ),
      );
    }, timeoutMs);
  });

  // Race between the actual promise and the timeout
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Creates a promise that rejects after a specified delay.
 * Useful for testing timeout scenarios.
 *
 * @param timeoutMs - Delay in milliseconds before rejection
 * @param message - Error message. Default: "Timeout"
 * @returns A promise that rejects after the delay
 *
 * @example
 * ```typescript
 * await Promise.race([
 *   fetchData(),
 *   timeoutPromise(5000, 'Fetch timed out')
 * ]);
 * ```
 */
export function timeoutPromise(
  timeoutMs: number,
  message = 'Timeout',
): Promise<never> {
  return new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new McpError(JsonRpcErrorCode.InternalError, message, { timeoutMs }),
      );
    }, timeoutMs);
  });
}
