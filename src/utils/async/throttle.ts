/**
 * @fileoverview Throttle utility for function call rate limiting.
 * @module src/utils/async/throttle
 */

/**
 * Creates a throttled function that only invokes the provided function at most once
 * per every `limitMs` milliseconds.
 *
 * Throttling ensures that the function is called at a controlled rate, regardless of
 * how many times the throttled function is invoked. The first call is executed immediately,
 * and subsequent calls are ignored until the time limit has passed.
 *
 * @param fn - The function to throttle
 * @param limitMs - The number of milliseconds to throttle invocations to
 * @returns A throttled version of the function
 *
 * @example
 * ```typescript
 * const throttledScroll = throttle(() => {
 *   handleScrollEvent();
 * }, 100);
 *
 * window.addEventListener('scroll', throttledScroll);
 * // handleScrollEvent will be called at most once every 100ms
 * ```
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number,
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  let timeoutId: NodeJS.Timeout | number | undefined;

  return function throttled(...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= limitMs) {
      // Execute immediately if enough time has passed
      lastCallTime = now;
      fn(...args);
    } else {
      // Schedule for later if we're still within the throttle period
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId as NodeJS.Timeout);
      }

      const remainingTime = limitMs - timeSinceLastCall;
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        fn(...args);
      }, remainingTime);
    }
  };
}

/**
 * Creates a throttled function with leading and trailing edge options.
 *
 * @param fn - The function to throttle
 * @param limitMs - The number of milliseconds to throttle invocations to
 * @param options - Configuration options
 * @param options.leading - Invoke on the leading edge (first call). Default: true
 * @param options.trailing - Invoke on the trailing edge (after throttle period). Default: true
 * @returns A throttled version of the function
 *
 * @example
 * ```typescript
 * // Only execute on trailing edge (after activity stops)
 * const throttledSave = throttleAdvanced(
 *   () => saveData(),
 *   1000,
 *   { leading: false, trailing: true }
 * );
 * ```
 */
export function throttleAdvanced<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = true } = options;
  let lastCallTime = 0;
  let timeoutId: NodeJS.Timeout | number | undefined;
  let lastArgs: Parameters<T> | null = null;

  return function throttled(...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    // Store args for potential trailing call
    lastArgs = args;

    if (timeSinceLastCall >= limitMs) {
      // Execute immediately if enough time has passed and leading is enabled
      if (leading) {
        lastCallTime = now;
        fn(...args);
      }

      // Clear any pending trailing call
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId as NodeJS.Timeout);
        timeoutId = undefined;
      }

      // Schedule trailing call if enabled
      if (trailing && !leading) {
        timeoutId = setTimeout(() => {
          lastCallTime = Date.now();
          if (lastArgs) {
            fn(...lastArgs);
          }
          timeoutId = undefined;
        }, limitMs);
      }
    } else {
      // Within throttle period - schedule trailing call if enabled
      if (trailing) {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId as NodeJS.Timeout);
        }

        const remainingTime = limitMs - timeSinceLastCall;
        timeoutId = setTimeout(() => {
          lastCallTime = Date.now();
          if (lastArgs) {
            fn(...lastArgs);
          }
          timeoutId = undefined;
        }, remainingTime);
      }
    }
  };
}
