/**
 * @fileoverview Array grouping utilities.
 * @module src/utils/array/group
 */

/**
 * Groups array elements by a key function.
 *
 * @param array - The array to group
 * @param keyFn - Function to extract the grouping key
 * @returns Object with grouped arrays
 *
 * @example
 * ```typescript
 * const users = [
 *   { name: 'Alice', age: 25 },
 *   { name: 'Bob', age: 30 },
 *   { name: 'Charlie', age: 25 },
 * ];
 * groupBy(users, u => u.age);
 * // { '25': [{ name: 'Alice', age: 25 }, { name: 'Charlie', age: 25 }],
 * //   '30': [{ name: 'Bob', age: 30 }] }
 *
 * groupBy(['one', 'two', 'three'], s => s.length);
 * // { '3': ['one', 'two'], '5': ['three'] }
 * ```
 */
export function groupBy<T>(
  array: T[],
  keyFn: (item: T) => string | number,
): Record<string | number, T[]> {
  const result: Record<string | number, T[]> = {};

  for (const item of array) {
    const key = keyFn(item);
    const existing = result[key];
    if (existing) {
      existing.push(item);
    } else {
      result[key] = [item];
    }
  }

  return result;
}

/**
 * Groups array elements by a property name.
 * Convenience wrapper around groupBy for object arrays.
 *
 * @param array - The array of objects to group
 * @param property - Property name to use for grouping
 * @returns Object with grouped arrays
 *
 * @example
 * ```typescript
 * const users = [
 *   { name: 'Alice', department: 'Engineering' },
 *   { name: 'Bob', department: 'Sales' },
 *   { name: 'Charlie', department: 'Engineering' },
 * ];
 * groupByProperty(users, 'department');
 * // {
 * //   'Engineering': [{ name: 'Alice', ... }, { name: 'Charlie', ... }],
 * //   'Sales': [{ name: 'Bob', ... }]
 * // }
 * ```
 */
export function groupByProperty<T extends Record<string, unknown>>(
  array: T[],
  property: keyof T,
): Record<string | number, T[]> {
  return groupBy(array, (item) => {
    const value = item[property];
    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }
    return String(value);
  });
}

/**
 * Counts occurrences of each unique value in an array.
 *
 * @param array - The array to count
 * @returns Object with counts for each unique value
 *
 * @example
 * ```typescript
 * countBy([1, 2, 2, 3, 3, 3]); // { '1': 1, '2': 2, '3': 3 }
 * countBy(['a', 'b', 'a', 'c', 'a']); // { 'a': 3, 'b': 1, 'c': 1 }
 * ```
 */
export function countBy<T>(
  array: T[],
  keyFn?: (item: T) => string | number,
): Record<string | number, number> {
  const result: Record<string | number, number> = {};

  for (const item of array) {
    const key = keyFn ? keyFn(item) : String(item);
    result[key] = (result[key] || 0) + 1;
  }

  return result;
}
