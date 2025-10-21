/**
 * @fileoverview String slugification utilities for URL-safe strings.
 * @module src/utils/string/slug
 */

/**
 * Converts a string to a URL-safe slug.
 * Removes special characters, converts to lowercase, and replaces spaces with hyphens.
 *
 * @param str - The string to slugify
 * @param separator - Character to use as separator. Default: '-'
 * @returns The slugified string
 *
 * @example
 * ```typescript
 * slugify('Hello World!'); // 'hello-world'
 * slugify('Foo & Bar'); // 'foo-and-bar'
 * slugify('  Multiple   Spaces  '); // 'multiple-spaces'
 * slugify('Hello_World', '_'); // 'hello_world'
 * ```
 */
export function slugify(str: string, separator = '-'): string {
  return str
    .toString()
    .normalize('NFD') // Normalize unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
    .replace(/\s+/g, separator) // Replace spaces with separator
    .replace(/-+/g, separator) // Replace multiple separators with single separator
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing separators
}

/**
 * Converts a string to a URL-safe slug with custom options.
 *
 * @param str - The string to slugify
 * @param options - Slugification options
 * @param options.separator - Character to use as separator. Default: '-'
 * @param options.lowercase - Convert to lowercase. Default: true
 * @param options.strict - Remove all non-alphanumeric characters. Default: false
 * @param options.trim - Trim whitespace from start and end. Default: true
 * @returns The slugified string
 *
 * @example
 * ```typescript
 * slugifyAdvanced('Hello World!', { separator: '_' }); // 'hello_world'
 * slugifyAdvanced('Hello World!', { lowercase: false }); // 'Hello-World'
 * slugifyAdvanced('Hello@World!', { strict: true }); // 'helloworld'
 * ```
 */
export function slugifyAdvanced(
  str: string,
  options: {
    separator?: string;
    lowercase?: boolean;
    strict?: boolean;
    trim?: boolean;
  } = {},
): string {
  const {
    separator = '-',
    lowercase = true,
    strict = false,
    trim = true,
  } = options;

  let result = str.toString().normalize('NFD');

  // Remove diacritics
  result = result.replace(/[\u0300-\u036f]/g, '');

  // Convert to lowercase if requested
  if (lowercase) {
    result = result.toLowerCase();
  }

  // Trim if requested
  if (trim) {
    result = result.trim();
  }

  // Replace special characters
  result = result.replace(/&/g, `${separator}and${separator}`);

  if (strict) {
    // Strict mode: remove all non-alphanumeric characters
    result = result
      .replace(/[^a-zA-Z0-9]+/g, separator)
      .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
  } else {
    // Normal mode: allow some special characters
    result = result
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/[\s_-]+/g, separator)
      .replace(new RegExp(`${separator}+`, 'g'), separator)
      .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
  }

  return result;
}

/**
 * Creates a unique slug by appending a counter if the slug already exists.
 *
 * @param str - The string to slugify
 * @param existingSlugs - Array of existing slugs to check against
 * @param separator - Character to use as separator. Default: '-'
 * @returns A unique slug
 *
 * @example
 * ```typescript
 * uniqueSlug('hello', ['hello', 'hello-1']); // 'hello-2'
 * uniqueSlug('world', []); // 'world'
 * uniqueSlug('test', ['test']); // 'test-1'
 * ```
 */
export function uniqueSlug(
  str: string,
  existingSlugs: string[],
  separator = '-',
): string {
  let slug = slugify(str, separator);
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${slugify(str, separator)}${separator}${counter}`;
    counter++;
  }

  return slug;
}
