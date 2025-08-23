/**
 * @fileoverview Provides centralized helper functions for common logging scenarios.
 * This module standardizes how operations, successes, and errors are logged
 * throughout the application, ensuring consistency and making future enhancements easier.
 * @module src/utils/internal/logging-helpers
 */

import { logger } from "./logger.js";
import { RequestContext } from "./requestContext.js";

interface OperationPayload {
  [key: string]: unknown;
}

/**
 * Logs the start of an operation.
 * @param context - The request context for the operation.
 * @param message - The log message describing the operation.
 * @param payload - Additional structured data to include in the log.
 */
export function logOperationStart(
  context: RequestContext,
  message: string,
  payload?: OperationPayload,
): void {
  logger.info({ ...context, ...payload }, message);
}

/**
 * Logs the successful completion of an operation.
 * @param context - The request context for the operation.
 * @param message - The log message describing the success.
 * @param payload - Additional structured data, like performance metrics.
 */
export function logOperationSuccess(
  context: RequestContext,
  message: string,
  payload?: OperationPayload,
): void {
  logger.info({ ...context, ...payload }, message);
}

/**
 * Logs a failed operation.
 * @param context - The request context for the operation.
 * @param message - The log message describing the error.
 * @param error - The error object.
 * @param payload - Additional structured data.
 */
export function logOperationError(
  context: RequestContext,
  message: string,
  error: unknown,
  payload?: OperationPayload,
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error({ err, ...context, ...payload }, message);
}

/**
 * Logs a warning.
 * @param context - The request context.
 * @param message - The warning message.
 * @param payload - Additional structured data.
 */
export function logWarning(
  context: RequestContext,
  message: string,
  payload?: OperationPayload,
): void {
  logger.warning({ ...context, ...payload }, message);
}

/**
 * Logs a fatal error and terminates the process.
 * This should be used for unrecoverable errors during critical phases like startup.
 * @param context - The request context.
 * @param message - The fatal error message.
 * @param error - The error object.
 */
export function logFatal(
  context: RequestContext,
  message: string,
  error: unknown,
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  // The logger's uncaughtException handler will exit, but we call fatal here for consistency.
  logger.fatal({ err, ...context }, message);
  // Ensure process exits if not already handled by uncaughtException handler
  setTimeout(() => process.exit(1), 10);
}
