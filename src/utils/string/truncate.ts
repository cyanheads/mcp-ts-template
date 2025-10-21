/**
 * @fileoverview String truncation utilities.
 * @module src/utils/string/truncate
 */

/**
 * Truncates a string to a maximum length, adding a suffix if truncated.
 *
 * @param str - The string to truncate
 * @param maxLength - Maximum length of the resulting string (including suffix)
 * @param suffix - Suffix to add when truncating. Default: '...'
 * @returns The truncated string
 *
 * @example
 * ```typescript
 * truncate('Hello, world!', 10); // 'Hello, ...'
 * truncate('Short', 10); // 'Short'
 * truncate('Hello, world!', 10, '…'); // 'Hello, wo…'
 * ```
 */
export function truncate(
  str: string,
  maxLength: number,
  suffix = '...',
): string {
  if (str.length <= maxLength) {
    return str;
  }

  const truncatedLength = maxLength - suffix.length;
  if (truncatedLength <= 0) {
    return suffix.slice(0, maxLength);
  }

  return str.slice(0, truncatedLength) + suffix;
}

/**
 * Truncates a string to a maximum length at a word boundary.
 * Ensures words are not cut in the middle.
 *
 * @param str - The string to truncate
 * @param maxLength - Maximum length of the resulting string (including suffix)
 * @param suffix - Suffix to add when truncating. Default: '...'
 * @returns The truncated string
 *
 * @example
 * ```typescript
 * truncateWords('Hello beautiful world', 15); // 'Hello...'
 * truncateWords('Hello beautiful world', 20); // 'Hello beautiful...'
 * ```
 */
export function truncateWords(
  str: string,
  maxLength: number,
  suffix = '...',
): string {
  if (str.length <= maxLength) {
    return str;
  }

  const truncatedLength = maxLength - suffix.length;
  if (truncatedLength <= 0) {
    return suffix.slice(0, maxLength);
  }

  // Find the last space before the truncation point
  const truncated = str.slice(0, truncatedLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + suffix;
  }

  // No space found, fall back to character truncation
  return truncated + suffix;
}

/**
 * Truncates a string in the middle, keeping the start and end.
 * Useful for file names, long identifiers, etc.
 *
 * @param str - The string to truncate
 * @param maxLength - Maximum length of the resulting string (including separator)
 * @param separator - Separator to use in the middle. Default: '...'
 * @returns The truncated string with middle removed
 *
 * @example
 * ```typescript
 * truncateMiddle('very-long-filename.txt', 20); // 'very-lon...ename.txt'
 * truncateMiddle('abcdefghijklmnopqrst', 10, '…'); // 'abcd…prst'
 * ```
 */
export function truncateMiddle(
  str: string,
  maxLength: number,
  separator = '...',
): string {
  if (str.length <= maxLength) {
    return str;
  }

  const separatorLength = separator.length;
  const charsToShow = maxLength - separatorLength;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);

  return (
    str.slice(0, frontChars) + separator + str.slice(str.length - backChars)
  );
}
