/**
 * @fileoverview Type guard utilities for safe runtime type narrowing.
 * @module utils/types/guards
 *
 * Provides reusable type guards to replace unsafe type assertions throughout the codebase.
 * All guards perform proper runtime validation and narrow TypeScript types safely.
 */

/**
 * Type guard to check if a value is a non-null object.
 *
 * @param value - Value to check
 * @returns True if value is an object (excluding null and arrays)
 *
 * @example
 * ```typescript
 * if (isObject(someValue)) {
 *   // someValue is now typed as object
 *   console.log(someValue.toString());
 * }
 * ```
 */
export function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a record (object with string keys).
 *
 * @param value - Value to check
 * @returns True if value is a Record<string, unknown>
 *
 * @example
 * ```typescript
 * if (isRecord(data)) {
 *   // data is now typed as Record<string, unknown>
 *   const keys = Object.keys(data);
 * }
 * ```
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value);
}

/**
 * Type guard to check if an object has a specific property.
 *
 * @param obj - Object to check
 * @param key - Property key to look for
 * @returns True if object has the specified property
 *
 * @example
 * ```typescript
 * if (hasProperty(error, 'message')) {
 *   // TypeScript now knows error has a 'message' property
 *   console.log(error.message);
 * }
 * ```
 */
export function hasProperty<K extends PropertyKey>(
  obj: unknown,
  key: K,
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Type guard to check if an object has a property of a specific type.
 *
 * @param obj - Object to check
 * @param key - Property key to look for
 * @param typeGuard - Type guard function for the property value
 * @returns True if object has the property and it matches the type
 *
 * @example
 * ```typescript
 * if (hasPropertyOfType(obj, 'count', (v): v is number => typeof v === 'number')) {
 *   // obj.count is now typed as number
 *   console.log(obj.count + 1);
 * }
 * ```
 */
export function hasPropertyOfType<K extends PropertyKey, T>(
  obj: unknown,
  key: K,
  typeGuard: (value: unknown) => value is T,
): obj is Record<K, T> {
  return hasProperty(obj, key) && typeGuard(obj[key]);
}

/**
 * Type guard to check if a value is a string.
 *
 * @param value - Value to check
 * @returns True if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a number.
 *
 * @param value - Value to check
 * @returns True if value is a number (excluding NaN)
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * Type guard to check if an error is an AggregateError.
 *
 * AggregateError contains multiple errors in an 'errors' array property.
 * This guard safely checks for the errors property without unsafe type assertions.
 *
 * @param error - Error to check
 * @returns True if error is an AggregateError with errors array
 *
 * @example
 * ```typescript
 * if (isAggregateError(error)) {
 *   // error.errors is now safely typed as unknown[]
 *   error.errors.forEach(innerError => console.log(innerError));
 * }
 * ```
 */
export function isAggregateError(
  error: unknown,
): error is Error & { errors: unknown[] } {
  return (
    error instanceof Error &&
    hasProperty(error, 'errors') &&
    Array.isArray(error.errors)
  );
}

/**
 * Type guard to check if an error has a code property.
 *
 * @param error - Error to check
 * @returns True if error has a code property
 *
 * @example
 * ```typescript
 * if (isErrorWithCode(error)) {
 *   console.log(`Error code: ${error.code}`);
 * }
 * ```
 */
export function isErrorWithCode(
  error: unknown,
): error is Error & { code: unknown } {
  return error instanceof Error && hasProperty(error, 'code');
}

/**
 * Type guard to check if an error has a status property.
 *
 * @param error - Error to check
 * @returns True if error has a status property
 *
 * @example
 * ```typescript
 * if (isErrorWithStatus(error)) {
 *   console.log(`HTTP status: ${error.status}`);
 * }
 * ```
 */
export function isErrorWithStatus(
  error: unknown,
): error is Error & { status: unknown } {
  return error instanceof Error && hasProperty(error, 'status');
}

/**
 * Safely get a property from an object if it exists.
 *
 * @param obj - Object to get property from
 * @param key - Property key
 * @returns Property value or undefined if property doesn't exist
 *
 * @example
 * ```typescript
 * const message = getProperty(error, 'message');
 * // message is typed as unknown
 * ```
 */
export function getProperty<K extends PropertyKey>(
  obj: unknown,
  key: K,
): unknown {
  return hasProperty(obj, key) ? obj[key] : undefined;
}

/**
 * Safely get a string property from an object.
 *
 * @param obj - Object to get property from
 * @param key - Property key
 * @returns String value or undefined if property doesn't exist or is not a string
 *
 * @example
 * ```typescript
 * const traceId = getStringProperty(context, 'traceId');
 * if (traceId) {
 *   // traceId is typed as string
 *   console.log(traceId.toUpperCase());
 * }
 * ```
 */
export function getStringProperty<K extends PropertyKey>(
  obj: unknown,
  key: K,
): string | undefined {
  const value = getProperty(obj, key);
  return isString(value) ? value : undefined;
}

/**
 * Safely get a number property from an object.
 *
 * @param obj - Object to get property from
 * @param key - Property key
 * @returns Number value or undefined if property doesn't exist or is not a number
 */
export function getNumberProperty<K extends PropertyKey>(
  obj: unknown,
  key: K,
): number | undefined {
  const value = getProperty(obj, key);
  return isNumber(value) ? value : undefined;
}
