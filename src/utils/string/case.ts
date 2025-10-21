/**
 * @fileoverview String case conversion utilities.
 * @module src/utils/string/case
 */

/**
 * Converts a string to camelCase.
 *
 * @param str - The string to convert
 * @returns The camelCase version of the string
 *
 * @example
 * ```typescript
 * camelCase('hello world'); // 'helloWorld'
 * camelCase('foo-bar-baz'); // 'fooBarBaz'
 * camelCase('FOO_BAR'); // 'fooBar'
 * ```
 */
export function camelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
      index === 0 ? letter.toLowerCase() : letter.toUpperCase(),
    )
    .replace(/[\s_-]+/g, '');
}

/**
 * Converts a string to PascalCase.
 *
 * @param str - The string to convert
 * @returns The PascalCase version of the string
 *
 * @example
 * ```typescript
 * pascalCase('hello world'); // 'HelloWorld'
 * pascalCase('foo-bar-baz'); // 'FooBarBaz'
 * pascalCase('foo_bar'); // 'FooBar'
 * ```
 */
export function pascalCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter) => letter.toUpperCase())
    .replace(/[\s_-]+/g, '');
}

/**
 * Converts a string to snake_case.
 *
 * @param str - The string to convert
 * @returns The snake_case version of the string
 *
 * @example
 * ```typescript
 * snakeCase('helloWorld'); // 'hello_world'
 * snakeCase('FooBarBaz'); // 'foo_bar_baz'
 * snakeCase('foo-bar'); // 'foo_bar'
 * ```
 */
export function snakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/[\s-]+/g, '_')
    .replace(/^_/, '')
    .toLowerCase();
}

/**
 * Converts a string to kebab-case.
 *
 * @param str - The string to convert
 * @returns The kebab-case version of the string
 *
 * @example
 * ```typescript
 * kebabCase('helloWorld'); // 'hello-world'
 * kebabCase('FooBarBaz'); // 'foo-bar-baz'
 * kebabCase('foo_bar'); // 'foo-bar'
 * ```
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/[\s_]+/g, '-')
    .replace(/^-/, '')
    .toLowerCase();
}

/**
 * Converts a string to Title Case (capitalizes the first letter of each word).
 *
 * @param str - The string to convert
 * @returns The Title Case version of the string
 *
 * @example
 * ```typescript
 * titleCase('hello world'); // 'Hello World'
 * titleCase('foo-bar-baz'); // 'Foo-Bar-Baz'
 * titleCase('the quick brown fox'); // 'The Quick Brown Fox'
 * ```
 */
export function titleCase(str: string): string {
  return str.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Converts a string to CONSTANT_CASE (uppercase snake_case).
 *
 * @param str - The string to convert
 * @returns The CONSTANT_CASE version of the string
 *
 * @example
 * ```typescript
 * constantCase('helloWorld'); // 'HELLO_WORLD'
 * constantCase('foo-bar'); // 'FOO_BAR'
 * ```
 */
export function constantCase(str: string): string {
  return snakeCase(str).toUpperCase();
}

/**
 * Converts a string to dot.case.
 *
 * @param str - The string to convert
 * @returns The dot.case version of the string
 *
 * @example
 * ```typescript
 * dotCase('helloWorld'); // 'hello.world'
 * dotCase('FooBarBaz'); // 'foo.bar.baz'
 * ```
 */
export function dotCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '.$1')
    .replace(/[\s_-]+/g, '.')
    .replace(/^\./, '')
    .toLowerCase();
}
