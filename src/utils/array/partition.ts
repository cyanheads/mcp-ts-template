/**
 * @fileoverview Array partitioning utilities.
 * @module src/utils/array/partition
 */

/**
 * Splits an array into two arrays based on a predicate function.
 * The first array contains items that match the predicate, the second contains items that don't.
 *
 * @param array - The array to partition
 * @param predicate - Function to test each element
 * @returns Tuple of [matching items, non-matching items]
 *
 * @example
 * ```typescript
 * partition([1, 2, 3, 4, 5], n => n % 2 === 0);
 * // [[2, 4], [1, 3, 5]]
 *
 * partition(
 *   [{ name: 'Alice', active: true }, { name: 'Bob', active: false }],
 *   u => u.active
 * );
 * // [[{ name: 'Alice', active: true }], [{ name: 'Bob', active: false }]]
 * ```
 */
export function partition<T>(
  array: T[],
  predicate: (item: T) => boolean,
): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];

  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }

  return [truthy, falsy];
}

/**
 * Splits an array into multiple partitions based on a key function.
 * Similar to groupBy but returns an array of arrays instead of an object.
 *
 * @param array - The array to partition
 * @param keyFn - Function to extract the partition key
 * @returns Map of partition key to array of items
 *
 * @example
 * ```typescript
 * partitionBy([1, 2, 3, 4, 5, 6], n => n % 3);
 * // Map { 1 => [1, 4], 2 => [2, 5], 0 => [3, 6] }
 * ```
 */
export function partitionBy<T, K>(
  array: T[],
  keyFn: (item: T) => K,
): Map<K, T[]> {
  const result = new Map<K, T[]>();

  for (const item of array) {
    const key = keyFn(item);
    const partition = result.get(key) || [];
    partition.push(item);
    result.set(key, partition);
  }

  return result;
}
