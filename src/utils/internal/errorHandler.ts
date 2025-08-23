/**
 * @fileoverview This module provides utilities for robust error handling.
 * It defines structures for error context, options for handling errors,
 * and mappings for classifying errors. The main `ErrorHandler` class
 * offers static methods for consistent error processing, logging, and transformation.
 * @module src/utils/internal/errorHandler
 */
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { JsonRpcErrorCode, McpError } from "../../types-global/errors.js";
import { requestContextService, sanitizeInputForLogging } from "../index.js";
import { logOperationError } from "./logging-helpers.js";
import { RequestContext } from "./requestContext.js";

/**
 * Defines a generic structure for providing context with errors.
 * This context can include identifiers like `requestId` or any other relevant
 * key-value pairs that aid in debugging or understanding the error's circumstances.
 */
export type ErrorContext = RequestContext;

/**
 * Configuration options for the `ErrorHandler.handleError` method.
 * These options control how an error is processed, logged, and whether it's rethrown.
 */
export interface ErrorHandlerOptions {
  /**
   * The context of the operation that caused the error.
   * This can include `requestId` and other relevant debugging information.
   */
  context?: ErrorContext;

  /**
   * A descriptive name of the operation being performed when the error occurred.
   * This helps in identifying the source or nature of the error in logs.
   * Example: "UserLogin", "ProcessPayment", "FetchUserProfile".
   */
  operation: string;

  /**
   * The input data or parameters that were being processed when the error occurred.
   * This input will be sanitized before logging to prevent sensitive data exposure.
   */
  input?: unknown;

  /**
   * If true, the (potentially transformed) error will be rethrown after handling.
   * Defaults to `false`.
   */
  rethrow?: boolean;

  /**
   * A specific `JsonRpcErrorCode` to assign to the error, overriding any
   * automatically determined error code.
   */
  errorCode?: JsonRpcErrorCode;

  /**
   * A custom function to map or transform the original error into a new `Error` instance.
   * If provided, this function is used instead of the default `McpError` creation.
   * @param error - The original error that occurred.
   * @returns The transformed error.
   */
  errorMapper?: (error: unknown) => Error;

  /**
   * If true, indicates that the error is critical and might require immediate attention
   * or could lead to system instability. This is primarily for logging and alerting.
   * Defaults to `false`.
   */
  critical?: boolean;
}

/**
 * Defines a rule for mapping error patterns to a specific JSON-RPC error code.
 */
export interface ErrorMappingRule {
  /**
   * A string or regular expression to match against the error message.
   */
  pattern: string | RegExp;
  /**
   * The `JsonRpcErrorCode` to assign if the pattern matches.
   */
  errorCode: JsonRpcErrorCode;
}

/**
 * Maps standard JavaScript error constructor names to `JsonRpcErrorCode` values.
 * @private
 */
const ERROR_TYPE_MAPPINGS: Readonly<Record<string, JsonRpcErrorCode>> = {
  SyntaxError: JsonRpcErrorCode.InvalidParams,
  TypeError: JsonRpcErrorCode.InvalidParams,
  ReferenceError: JsonRpcErrorCode.InternalError,
  RangeError: JsonRpcErrorCode.InvalidParams,
  URIError: JsonRpcErrorCode.InvalidParams,
  EvalError: JsonRpcErrorCode.InternalError,
};

/**
 * Array of `ErrorMappingRule` to classify errors by message/name patterns.
 * Order matters: more specific patterns should precede generic ones.
 * @private
 */
const COMMON_ERROR_PATTERNS: ReadonlyArray<Readonly<ErrorMappingRule>> = [
  {
    pattern: /auth|unauthorized|unauthenticated|invalid.*token/i,
    errorCode: JsonRpcErrorCode.Unauthorized,
  },
  {
    pattern: /permission|forbidden|access.*denied/i,
    errorCode: JsonRpcErrorCode.Forbidden,
  },
  {
    pattern: /not found|missing|no such/i,
    errorCode: JsonRpcErrorCode.NotFound,
  },
  {
    pattern:
      /invalid|validation|malformed|bad request|wrong format|missing required/i,
    errorCode: JsonRpcErrorCode.InvalidParams, // Use the standard code for invalid parameters
  },
  {
    pattern: /conflict|already exists|duplicate/i,
    errorCode: JsonRpcErrorCode.Conflict,
  },
  {
    pattern: /rate limit|too many requests/i,
    errorCode: JsonRpcErrorCode.RateLimited,
  },
  {
    pattern: /timeout|timed out/i,
    errorCode: JsonRpcErrorCode.Timeout,
  },
  {
    pattern: /service unavailable|bad gateway/i,
    errorCode: JsonRpcErrorCode.ServiceUnavailable,
  },
];

/**
 * Creates a "safe" RegExp for testing error messages.
 * @param pattern - The string or RegExp pattern.
 * @returns A new RegExp instance.
 * @private
 */
function createSafeRegex(pattern: string | RegExp): RegExp {
  if (pattern instanceof RegExp) {
    let flags = pattern.flags.replace("g", "");
    if (!flags.includes("i")) flags += "i";
    return new RegExp(pattern.source, flags);
  }
  return new RegExp(pattern, "i");
}

function getErrorName(error: unknown): string {
  if (error instanceof Error) return error.name || "Error";
  return "NonError";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred.";
}

/**
 * A utility class providing static methods for comprehensive error handling.
 */
export class ErrorHandler {
  /**
   * Determines an appropriate `JsonRpcErrorCode` for a given error.
   * @param error - The error instance or value to classify.
   * @returns The determined error code.
   */
  public static determineErrorCode(error: unknown): JsonRpcErrorCode {
    if (error instanceof McpError) {
      return error.code;
    }

    const errorName = getErrorName(error);
    const errorMessage = getErrorMessage(error);

    const mappedFromType = ERROR_TYPE_MAPPINGS[errorName];
    if (mappedFromType) {
      return mappedFromType;
    }

    for (const mapping of COMMON_ERROR_PATTERNS) {
      const regex = createSafeRegex(mapping.pattern);
      if (regex.test(errorMessage) || regex.test(errorName)) {
        return mapping.errorCode;
      }
    }
    return JsonRpcErrorCode.InternalError;
  }

  public static handleError(
    error: unknown,
    options: ErrorHandlerOptions,
  ): Error {
    this._recordOtelError(error);

    const finalError = this._createFinalError(error, options);
    const logPayload = this._buildLogPayload(finalError, error, options);

    // Ensure a valid context exists for logging.
    const contextForLogging =
      options.context ??
      requestContextService.createRequestContext({
        operation: options.operation,
      });

    // Use the centralized logging helper for consistent error logging.
    logOperationError(
      contextForLogging,
      finalError.message,
      finalError,
      logPayload,
    );

    if (options.rethrow ?? false) {
      throw finalError;
    }
    return finalError;
  }

  private static _recordOtelError(error: unknown): void {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) return;

    if (error instanceof Error) {
      activeSpan.recordException(error);
    }
    activeSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: getErrorMessage(error),
    });
  }

  private static _createFinalError(
    error: unknown,
    options: ErrorHandlerOptions,
  ): Error {
    if (options.errorMapper) {
      return options.errorMapper(error);
    }

    const determinedCode = options.errorCode || this.determineErrorCode(error);
    const originalMessage = getErrorMessage(error);

    if (error instanceof McpError) {
      error.code = determinedCode; // Allow override
      return error;
    }

    return new McpError(
      determinedCode,
      `Error in ${options.operation}: ${originalMessage}`,
      {
        originalErrorName: getErrorName(error),
        originalMessage,
      },
      { cause: error instanceof Error ? error : undefined },
    );
  }

  private static _buildLogPayload(
    finalError: Error,
    originalError: unknown,
    options: ErrorHandlerOptions,
  ): Record<string, unknown> {
    const { context = {}, operation, input, critical = false } = options;

    const payload: Record<string, unknown> = {
      ...context,
      operation,
      input: input !== undefined ? sanitizeInputForLogging(input) : undefined,
      critical,
      errorCode:
        finalError instanceof McpError
          ? finalError.code
          : this.determineErrorCode(finalError),
      originalErrorType: getErrorName(originalError),
      finalErrorType: getErrorName(finalError),
    };

    // The Pino error serializer will handle the stack trace automatically.
    return payload;
  }

  /**
   * Formats an error into a consistent object structure for API responses.
   * @param error - The error instance or value to format.
   * @returns A structured representation of the error.
   */
  public static formatError(error: unknown): Record<string, unknown> {
    if (error instanceof McpError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details ?? {},
      };
    }

    return {
      code: this.determineErrorCode(error),
      message: getErrorMessage(error),
      details: { errorType: getErrorName(error) },
    };
  }

  /**
   * Safely executes a function and handles errors using `ErrorHandler.handleError`.
   * @param fn - The function to execute.
   * @param options - Error handling options.
   * @returns A promise resolving with the result of `fn`.
   */
  public static async tryCatch<T>(
    fn: () => Promise<T> | T,
    options: Omit<ErrorHandlerOptions, "rethrow">,
  ): Promise<T> {
    try {
      return await Promise.resolve(fn());
    } catch (error) {
      throw this.handleError(error, { ...options, rethrow: true });
    }
  }
}
