/**
 * @fileoverview Retry utility for async operations with exponential backoff.
 * @module src/utils/async/retry
 */
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import type { RequestContext } from '@/utils/index.js';
import { logger } from '@/utils/index.js';

/**
 * Configuration options for retry behavior.
 */
export interface RetryOptions {
  /** Maximum number of attempts (including the initial attempt) */
  maxAttempts: number;
  /** Initial delay in milliseconds before the first retry */
  delayMs: number;
  /** Multiplier for exponential backoff (e.g., 2 for doubling). Default: 1 (no backoff) */
  backoffMultiplier?: number;
  /** Maximum delay in milliseconds (caps exponential backoff). Optional */
  maxDelayMs?: number;
  /** Function to determine if an error should trigger a retry. Default: always retry */
  shouldRetry?: (error: unknown) => boolean;
  /** Function called before each retry with attempt number and delay */
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

/**
 * Retries an async operation with configurable exponential backoff.
 * Throws the last error if all attempts fail.
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @param context - Request context for logging
 * @returns The result of the successful operation
 * @throws {McpError} If all retry attempts fail
 *
 * @example
 * ```typescript
 * const result = await retry(
 *   async () => fetchData(),
 *   {
 *     maxAttempts: 3,
 *     delayMs: 1000,
 *     backoffMultiplier: 2,
 *     shouldRetry: (error) => error instanceof NetworkError,
 *   },
 *   context
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  context: RequestContext,
): Promise<T> {
  const {
    maxAttempts,
    delayMs: initialDelayMs,
    backoffMultiplier = 1,
    maxDelayMs,
    shouldRetry = () => true,
    onRetry,
  } = options;

  if (maxAttempts < 1) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'maxAttempts must be at least 1',
      { maxAttempts },
    );
  }

  let lastError: unknown;
  let currentDelayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`Retry attempt ${attempt}/${maxAttempts}`, {
        ...context,
        attempt,
        maxAttempts,
      });

      const result = await fn();

      if (attempt > 1) {
        logger.info(`Operation succeeded after ${attempt} attempt(s)`, context);
      }

      return result;
    } catch (error: unknown) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        logger.warning('Error not retryable, throwing immediately', {
          ...context,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt === maxAttempts) {
        logger.error(`All ${maxAttempts} retry attempts failed`, {
          ...context,
          maxAttempts,
          error: error instanceof Error ? error.message : String(error),
        });
        break;
      }

      // Calculate delay with exponential backoff
      const delayForThisRetry = maxDelayMs
        ? Math.min(currentDelayMs, maxDelayMs)
        : currentDelayMs;

      logger.warning(
        `Attempt ${attempt}/${maxAttempts} failed, retrying in ${delayForThisRetry}ms`,
        {
          ...context,
          attempt,
          delayMs: delayForThisRetry,
          error: error instanceof Error ? error.message : String(error),
        },
      );

      // Call onRetry hook if provided
      if (onRetry) {
        onRetry(attempt, delayForThisRetry, error);
      }

      // Wait before next retry
      await new Promise((resolve) => setTimeout(resolve, delayForThisRetry));

      // Apply backoff for next iteration
      currentDelayMs = Math.floor(currentDelayMs * backoffMultiplier);
    }
  }

  // All attempts failed, throw the last error wrapped in McpError
  if (lastError instanceof McpError) {
    throw lastError;
  }

  throw new McpError(
    JsonRpcErrorCode.InternalError,
    `Operation failed after ${maxAttempts} attempts`,
    {
      attempts: maxAttempts,
      lastError:
        lastError instanceof Error ? lastError.message : String(lastError),
    },
  );
}
