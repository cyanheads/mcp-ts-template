/**
 * @fileoverview Debounce utility for function call rate limiting.
 * @module src/utils/async/debounce
 */

/**
 * Creates a debounced function that delays invoking the provided function until after
 * `delayMs` milliseconds have elapsed since the last time the debounced function was invoked.
 *
 * Debouncing ensures that the function is called only after a specified period of inactivity.
 * Useful for handling events like window resizing, search input, etc.
 *
 * @param fn - The function to debounce
 * @param delayMs - The number of milliseconds to delay
 * @returns A debounced version of the function
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query: string) => {
 *   performSearch(query);
 * }, 300);
 *
 * // Called multiple times rapidly
 * debouncedSearch('a');
 * debouncedSearch('ab');
 * debouncedSearch('abc'); // Only this call will execute after 300ms of inactivity
 * ```
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | number | undefined;

  return function debounced(...args: Parameters<T>): void {
    // Clear the previous timeout
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId as NodeJS.Timeout);
    }

    // Set a new timeout
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
}

/**
 * Creates a debounced async function that returns a promise.
 * Only the last call's promise will resolve; previous calls will be ignored.
 *
 * @param fn - The async function to debounce
 * @param delayMs - The number of milliseconds to delay
 * @returns A debounced version of the async function
 *
 * @example
 * ```typescript
 * const debouncedFetch = debounceAsync(async (id: string) => {
 *   return await fetchData(id);
 * }, 300);
 *
 * // Only the last call will execute and resolve
 * debouncedFetch('1');
 * debouncedFetch('2');
 * const result = await debouncedFetch('3'); // Only this resolves
 * ```
 */
export function debounceAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | number | undefined;
  let pendingPromise: {
    resolve: (value: ReturnType<T>) => void;
    reject: (reason: unknown) => void;
  } | null = null;

  return function debouncedAsync(...args: Parameters<T>): Promise<ReturnType<T>> {
    // Clear the previous timeout
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId as NodeJS.Timeout);
    }

    // Return a new promise
    return new Promise((resolve, reject) => {
      // Store the resolve/reject for this call
      pendingPromise = { resolve, reject };

      // Set a new timeout
      timeoutId = setTimeout(() => {
        const currentPromise = pendingPromise;
        if (currentPromise) {
          fn(...args)
            .then((result) => {
              if (currentPromise === pendingPromise) {
                currentPromise.resolve(result as ReturnType<T>);
              }
            })
            .catch((error) => {
              if (currentPromise === pendingPromise) {
                currentPromise.reject(error);
              }
            });
        }
      }, delayMs);
    });
  };
}
