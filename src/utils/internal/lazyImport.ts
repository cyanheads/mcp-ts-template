/**
 * @fileoverview Lazy-import utility for optional peer dependencies. Caches both
 * successful and failed import results to prevent repeated dynamic `import()`
 * attempts and metric spam when a dependency is statically absent.
 * @module src/utils/internal/lazyImport
 */
import { configurationError } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';

/**
 * Creates a lazy loader for an optional peer dependency that caches both
 * successful and failed import results.
 *
 * On success the module is cached and returned on all subsequent calls.
 * On failure a warning is logged once and all subsequent calls throw a
 * `ConfigurationError` immediately — no retry, no `ErrorHandler` involvement,
 * no counter increment.
 *
 * @param importFn - Thunk that performs the dynamic `import()`. Using a thunk
 *   preserves the literal module specifier for bundlers and TypeScript type
 *   inference.
 * @param hint - Human-readable install instruction included in the
 *   `ConfigurationError` message and the one-time warning log.
 * @returns Async function that resolves to the imported module or throws
 *   `ConfigurationError`.
 */
export function lazyImport<T>(importFn: () => Promise<T>, hint: string): () => Promise<T> {
  let mod: T | undefined;
  let failed = false;

  return async () => {
    if (mod) return mod;
    if (failed) throw configurationError(hint);
    try {
      mod = await importFn();
      return mod;
    } catch {
      failed = true;
      logger.warning(hint);
      throw configurationError(hint);
    }
  };
}
