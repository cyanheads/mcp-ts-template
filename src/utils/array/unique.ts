/**
 * @fileoverview Array uniqueness utilities.
 * @module src/utils/array/unique
 */

/**
 * Returns an array with duplicate values removed.
 * Uses Set for primitive values.
 *
 * @param array - The array to process
 * @returns Array with unique values
 *
 * @example
 * ```typescript
 * unique([1, 2, 2, 3, 3, 3]); // [1, 2, 3]
 * unique(['a', 'b', 'a', 'c']); // ['a', 'b', 'c']
 * unique([]); // []
 * ```
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Returns an array with duplicate values removed based on a key function.
 * The key function is used to determine uniqueness.
 *
 * @param array - The array to process
 * @param keyFn - Function to extract the comparison key
 * @returns Array with unique values
 *
 * @example
 * ```typescript
 * const users = [
 *   { id: 1, name: 'Alice' },
 *   { id: 2, name: 'Bob' },
 *   { id: 1, name: 'Alice' },
 * ];
 * uniqueBy(users, u => u.id); // [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
 * uniqueBy(['hello', 'world', 'HELLO'], s => s.toLowerCase()); // ['hello', 'world']
 * ```
 */
export function uniqueBy<T>(array: T[], keyFn: (item: T) => unknown): T[] {
  const seen = new Set();
  const result: T[] = [];

  for (const item of array) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

/**
 * Returns an array with duplicate values removed based on a property name.
 * Convenience wrapper around uniqueBy for object arrays.
 *
 * @param array - The array of objects to process
 * @param property - Property name to use for uniqueness
 * @returns Array with unique objects
 *
 * @example
 * ```typescript
 * const users = [
 *   { id: 1, name: 'Alice' },
 *   { id: 2, name: 'Bob' },
 *   { id: 1, name: 'Alice' },
 * ];
 * uniqueByProperty(users, 'id'); // [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
 * ```
 */
export function uniqueByProperty<T extends Record<string, unknown>>(
  array: T[],
  property: keyof T,
): T[] {
  return uniqueBy(array, (item) => item[property]);
}
