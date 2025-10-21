/**
 * @fileoverview Sleep utility for async delays.
 * @module src/utils/async/sleep
 */

/**
 * Creates a promise that resolves after a specified delay.
 * Useful for adding delays in async code or rate limiting.
 *
 * @param ms - Number of milliseconds to sleep
 * @returns A promise that resolves after the delay
 *
 * @example
 * ```typescript
 * console.log('Starting...');
 * await sleep(1000);
 * console.log('1 second later');
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
