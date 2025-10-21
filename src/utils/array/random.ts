/**
 * @fileoverview Array randomization utilities.
 * @module src/utils/array/random
 */

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * Returns a new array; does not modify the original.
 *
 * @param array - The array to shuffle
 * @returns A new shuffled array
 *
 * @example
 * ```typescript
 * shuffle([1, 2, 3, 4, 5]); // [3, 1, 5, 2, 4] (random order)
 * shuffle(['a', 'b', 'c']); // ['c', 'a', 'b'] (random order)
 * ```
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }

  return result;
}

/**
 * Randomly samples N items from an array without replacement.
 * Returns a new array with the sampled items.
 *
 * @param array - The array to sample from
 * @param count - Number of items to sample
 * @returns Array of sampled items
 *
 * @example
 * ```typescript
 * sample([1, 2, 3, 4, 5], 3); // [2, 5, 1] (random selection)
 * sample(['a', 'b', 'c', 'd'], 2); // ['c', 'a'] (random selection)
 * ```
 */
export function sample<T>(array: T[], count: number): T[] {
  if (count <= 0) {
    return [];
  }

  if (count >= array.length) {
    return [...array];
  }

  const shuffled = shuffle(array);
  return shuffled.slice(0, count);
}

/**
 * Returns a single random item from an array.
 *
 * @param array - The array to sample from
 * @returns A random item from the array, or undefined if array is empty
 *
 * @example
 * ```typescript
 * sampleOne([1, 2, 3, 4, 5]); // 3 (random item)
 * sampleOne(['a', 'b', 'c']); // 'b' (random item)
 * sampleOne([]); // undefined
 * ```
 */
export function sampleOne<T>(array: T[]): T | undefined {
  if (array.length === 0) {
    return undefined;
  }

  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

/**
 * Randomly samples N items from an array with replacement (items can be selected multiple times).
 *
 * @param array - The array to sample from
 * @param count - Number of items to sample
 * @returns Array of sampled items (may contain duplicates)
 *
 * @example
 * ```typescript
 * sampleWithReplacement([1, 2, 3], 5); // [2, 1, 2, 3, 2] (random with possible duplicates)
 * ```
 */
export function sampleWithReplacement<T>(array: T[], count: number): T[] {
  if (count <= 0) {
    return [];
  }

  if (array.length === 0) {
    return [];
  }

  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * array.length);
    result.push(array[index]!);
  }

  return result;
}
