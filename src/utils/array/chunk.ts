/**
 * @fileoverview Array chunking utilities.
 * @module src/utils/array/chunk
 */

/**
 * Splits an array into chunks of a specified size.
 *
 * @param array - The array to chunk
 * @param size - The size of each chunk
 * @returns Array of chunks
 *
 * @example
 * ```typescript
 * chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
 * chunk(['a', 'b', 'c', 'd'], 3); // [['a', 'b', 'c'], ['d']]
 * chunk([], 2); // []
 * ```
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be greater than 0');
  }

  if (array.length === 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

/**
 * Splits an array into a specified number of roughly equal chunks.
 *
 * @param array - The array to split
 * @param count - Number of chunks to create
 * @returns Array of chunks
 *
 * @example
 * ```typescript
 * chunkInto([1, 2, 3, 4, 5], 2); // [[1, 2, 3], [4, 5]]
 * chunkInto([1, 2, 3, 4, 5, 6, 7], 3); // [[1, 2, 3], [4, 5], [6, 7]]
 * ```
 */
export function chunkInto<T>(array: T[], count: number): T[][] {
  if (count <= 0) {
    throw new Error('Chunk count must be greater than 0');
  }

  if (array.length === 0) {
    return [];
  }

  const chunkSize = Math.ceil(array.length / count);
  return chunk(array, chunkSize);
}
