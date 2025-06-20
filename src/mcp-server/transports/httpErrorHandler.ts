/**
 * @fileoverview Centralized error handler for the Hono HTTP transport.
 * This middleware intercepts errors that occur during request processing,
 * standardizes them using the application's ErrorHandler utility, and
 * formats them into a consistent JSON-RPC error response.
 * @module src/mcp-server/transports/httpErrorHandler
 */

import { Context } from "hono";
import { StatusCode } from "hono/utils/http-status";
import { BaseErrorCode, McpError } from "../../types-global/errors.js";
import { ErrorHandler, requestContextService } from "../../utils/index.js";

/**
 * A centralized error handling middleware for Hono.
 * This function is registered with `app.onError()` and will catch any errors
 * thrown from preceding middleware or route handlers.
 *
 * @param err - The error that was thrown.
 * @param c - The Hono context object for the request.
 * @returns A Response object containing the formatted JSON-RPC error.
 */
export const httpErrorHandler = async (err: Error, c: Context) => {
  const context = requestContextService.createRequestContext({
    operation: "httpErrorHandler",
    path: c.req.path,
    method: c.req.method,
  });

  const handledError = ErrorHandler.handleError(err, {
    operation: "httpTransport",
    context,
  });

  let status = 500;
  if (handledError instanceof McpError) {
    switch (handledError.code) {
      case BaseErrorCode.NOT_FOUND:
        status = 404;
        break;
      case BaseErrorCode.UNAUTHORIZED:
        status = 401;
        break;
      case BaseErrorCode.FORBIDDEN:
        status = 403;
        break;
      case BaseErrorCode.VALIDATION_ERROR:
        status = 400;
        break;
      case BaseErrorCode.CONFLICT:
        status = 409;
        break;
      case BaseErrorCode.RATE_LIMITED:
        status = 429;
        break;
      default:
        status = 500;
    }
  }

  // Attempt to get the request ID from the body, but don't fail if it's not there or unreadable.
  let requestId: string | number | null = null;
  try {
    const body = await c.req.json();
    requestId = body?.id || null;
  } catch {
    // Ignore parsing errors, requestId will remain null
  }

  const errorCode =
    handledError instanceof McpError ? handledError.code : -32603;

  c.status(status as StatusCode);
  return c.json({
    jsonrpc: "2.0",
    error: {
      code: errorCode,
      message: handledError.message,
    },
    id: requestId,
  });
};
