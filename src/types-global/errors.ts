/**
 * @fileoverview Defines standardized error codes, a custom error class, and related schemas
 * for handling errors within the Model Context Protocol (MCP) server and its components.
 * This module provides a structured way to represent and communicate errors, ensuring
 * consistency and clarity for both server-side operations and client-side error handling.
 * @module src/types-global/errors
 */
import { z } from 'zod';

/**
 * Defines JSON-RPC 2.0 error codes, including standard and implementation-defined codes.
 * @see https://www.jsonrpc.org/specification#error_object
 */
export enum JsonRpcErrorCode {
  // Standard JSON-RPC 2.0 Errors
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,

  // Implementation-defined server-errors (-32000 to -32099)
  ServiceUnavailable = -32000,
  NotFound = -32001,
  Conflict = -32002,
  RateLimited = -32003,
  Timeout = -32004,
  Forbidden = -32005,
  Unauthorized = -32006,
  ValidationError = -32007,
  ConfigurationError = -32008,
  InitializationFailed = -32009,
  DatabaseError = -32010,
  SerializationError = -32070, // Data serialization/deserialization failed
  UnknownError = -32099, // A generic fallback
}

/**
 * Custom error class for MCP-specific errors, extending the built-in `Error` class.
 * It standardizes error reporting by encapsulating a `JsonRpcErrorCode`, a descriptive
 * human-readable message, and optional structured data for more context.
 *
 * This class is central to error handling within the MCP framework, allowing for
 * consistent error creation and propagation.
 */
export class McpError extends Error {
  /**
   * The standardized error code from {@link JsonRpcErrorCode}.
   */
  public readonly code: JsonRpcErrorCode;

  /**
   * Optional additional data about the error, conforming to the JSON-RPC 2.0 specification.
   * This can be any structured data that helps in understanding or debugging the error.
   * @see https://www.jsonrpc.org/specification#error_object
   */
  public readonly data?: Record<string, unknown>;

  /**
   * Creates an instance of McpError.
   *
   * @param code - The standardized error code that categorizes the error.
   * @param message - A human-readable description of the error.
   * @param data - Optional. A record containing additional structured data about the error.
   */
  constructor(
    code: JsonRpcErrorCode,
    message?: string,
    data?: Record<string, unknown>,
    options?: { cause?: unknown },
  ) {
    super(message, options);

    this.code = code;
    if (data) {
      this.data = data;
    }
    this.name = 'McpError';

    // Maintain a proper prototype chain.
    Object.setPrototypeOf(this, McpError.prototype);

    // Capture the stack trace, excluding the constructor call from it, if available.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, McpError);
    }
  }
}

// ---------------------------------------------------------------------------
// Factory functions — ergonomic alternatives to `new McpError(code, msg, data)`
// ---------------------------------------------------------------------------

/** Options shared by all error factory functions (re-uses the ES2022 built-in). */
export type ErrorFactoryOptions = ErrorOptions;

/** Create an InvalidParams (-32602) error. */
export const invalidParams = (
  message: string,
  data?: Record<string, unknown>,
  options?: ErrorFactoryOptions,
) => new McpError(JsonRpcErrorCode.InvalidParams, message, data, options);

/** Create an InvalidRequest (-32600) error. */
export const invalidRequest = (
  message: string,
  data?: Record<string, unknown>,
  options?: ErrorFactoryOptions,
) => new McpError(JsonRpcErrorCode.InvalidRequest, message, data, options);

/** Create a NotFound (-32001) error. */
export const notFound = (
  message: string,
  data?: Record<string, unknown>,
  options?: ErrorFactoryOptions,
) => new McpError(JsonRpcErrorCode.NotFound, message, data, options);

/** Create a Forbidden (-32005) error. */
export const forbidden = (
  message: string,
  data?: Record<string, unknown>,
  options?: ErrorFactoryOptions,
) => new McpError(JsonRpcErrorCode.Forbidden, message, data, options);

/** Create an Unauthorized (-32006) error. */
export const unauthorized = (
  message: string,
  data?: Record<string, unknown>,
  options?: ErrorFactoryOptions,
) => new McpError(JsonRpcErrorCode.Unauthorized, message, data, options);

/** Create a ValidationError (-32007) error. */
export const validationError = (
  message: string,
  data?: Record<string, unknown>,
  options?: ErrorFactoryOptions,
) => new McpError(JsonRpcErrorCode.ValidationError, message, data, options);

/** Create a Conflict (-32002) error. */
export const conflict = (
  message: string,
  data?: Record<string, unknown>,
  options?: ErrorFactoryOptions,
) => new McpError(JsonRpcErrorCode.Conflict, message, data, options);

/** Create a RateLimited (-32003) error. */
export const rateLimited = (
  message: string,
  data?: Record<string, unknown>,
  options?: ErrorFactoryOptions,
) => new McpError(JsonRpcErrorCode.RateLimited, message, data, options);

/** Create a Timeout (-32004) error. */
export const timeout = (
  message: string,
  data?: Record<string, unknown>,
  options?: ErrorFactoryOptions,
) => new McpError(JsonRpcErrorCode.Timeout, message, data, options);

/** Create a ServiceUnavailable (-32000) error. */
export const serviceUnavailable = (
  message: string,
  data?: Record<string, unknown>,
  options?: ErrorFactoryOptions,
) => new McpError(JsonRpcErrorCode.ServiceUnavailable, message, data, options);

/** Create a ConfigurationError (-32008) error. */
export const configurationError = (
  message: string,
  data?: Record<string, unknown>,
  options?: ErrorFactoryOptions,
) => new McpError(JsonRpcErrorCode.ConfigurationError, message, data, options);

/**
 * Zod schema for validating error objects. This schema can be used for:
 * - Validating error structures when parsing error responses from external services.
 * - Ensuring consistency when creating or handling error objects internally.
 * - Generating TypeScript types for error objects.
 *
 * The schema enforces the presence of a `code` (from {@link JsonRpcErrorCode}) and a `message`,
 * and allows for optional `data`.
 */
export const ErrorSchema = z
  .object({
    /**
     * The error code, corresponding to one of the {@link JsonRpcErrorCode} enum values.
     * This field is required and helps in programmatically identifying the error type.
     */
    code: z
      .nativeEnum(JsonRpcErrorCode)
      .describe('Standardized error code from JsonRpcErrorCode enum'),
    /**
     * A human-readable, descriptive message explaining the error.
     * This field is required and provides context to developers or users.
     */
    message: z
      .string()
      .min(1, 'Error message cannot be empty.')
      .describe('Detailed human-readable error message'),
    /**
     * Optional. A record containing additional structured data or context about the error,
     * conforming to the JSON-RPC 2.0 `data` field.
     */
    data: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Optional structured data providing more context about the error'),
  })
  .describe(
    'Schema for validating structured error objects, ensuring consistency in error reporting.',
  );

/**
 * TypeScript type inferred from the {@link ErrorSchema}.
 * This type represents the structure of a validated error object, commonly used
 * for error responses or when passing error information within the application.
 */
export type ErrorResponse = z.infer<typeof ErrorSchema>;
