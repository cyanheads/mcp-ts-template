/**
 * @fileoverview Helper utilities for error inspection and normalization.
 * @module src/utils/internal/error-handler/helpers
 */

/**
 * Creates a "safe" RegExp for testing error messages.
 * Ensures case-insensitivity and removes the global flag.
 * @param pattern - The string or RegExp pattern.
 * @returns A new RegExp instance.
 */
export function createSafeRegex(pattern: string | RegExp): RegExp {
  if (pattern instanceof RegExp) {
    let flags = pattern.flags.replace('g', '');
    if (!flags.includes('i')) {
      flags += 'i';
    }
    return new RegExp(pattern.source, flags);
  }
  return new RegExp(pattern, 'i');
}

/**
 * Retrieves a descriptive name for an error object or value.
 * @param error - The error object or value.
 * @returns A string representing the error's name or type.
 */
export function getErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name || 'Error';
  }
  if (error === null) {
    return 'NullValueEncountered';
  }
  if (error === undefined) {
    return 'UndefinedValueEncountered';
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    error.constructor &&
    typeof error.constructor.name === 'string' &&
    error.constructor.name !== 'Object'
  ) {
    return `${error.constructor.name}Encountered`;
  }
  return `${typeof error}Encountered`;
}

/**
 * Extracts a message string from an error object or value.
 * @param error - The error object or value.
 * @returns The error message string.
 */
export function getErrorMessage(error: unknown): string {
  try {
    if (error instanceof Error) {
      // AggregateError should surface combined messages succinctly
      if (
        'errors' in error &&
        Array.isArray((error as unknown as { errors: unknown[] }).errors)
      ) {
        const inner = (error as unknown as { errors: unknown[] }).errors
          .map((e) => (e instanceof Error ? e.message : String(e)))
          .filter(Boolean)
          .slice(0, 3)
          .join('; ');
        return inner ? `${error.message}: ${inner}` : error.message;
      }
      return error.message;
    }
    if (error === null) {
      return 'Null value encountered as error';
    }
    if (error === undefined) {
      return 'Undefined value encountered as error';
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'number' || typeof error === 'boolean') {
      return String(error);
    }
    if (typeof error === 'bigint') {
      return error.toString();
    }
    if (typeof error === 'function') {
      return `[function ${error.name || 'anonymous'}]`;
    }
    if (typeof error === 'object') {
      try {
        const json = JSON.stringify(error);
        if (json && json !== '{}') return json;
      } catch {
        // fall through
      }
      const ctor = (error as { constructor?: { name?: string } }).constructor
        ?.name;
      return `Non-Error object encountered (constructor: ${ctor || 'Object'})`;
    }
    if (typeof error === 'symbol') {
      return error.toString();
    }
    // c8 ignore next
    return '[unrepresentable error]';
  } catch (conversionError) {
    return `Error converting error to string: ${conversionError instanceof Error ? conversionError.message : 'Unknown conversion error'}`;
  }
}
