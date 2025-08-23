/**
 * @fileoverview Centralized error handler for the Hono HTTP transport.
 * This middleware intercepts errors that occur during request processing,
 * standardizes them using the application's ErrorHandler utility, and
 * formats them into a consistent JSON-RPC error response.
 * @module src/mcp-server/transports/httpErrorHandler
 */

import { Context } from "hono";
import { StatusCode } from "hono/utils/http-status";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import { ErrorHandler, requestContextService } from "../../../utils/index.js";
import { logOperationStart } from "../../../utils/internal/logging-helpers.js";
import { HonoNodeBindings } from "./httpTypes.js";

function toHttpCode(errorCode: JsonRpcErrorCode): StatusCode {
  switch (errorCode) {
    case JsonRpcErrorCode.ParseError:
    case JsonRpcErrorCode.InvalidRequest:
    case JsonRpcErrorCode.InvalidParams:
    case JsonRpcErrorCode.ValidationError:
      return 400;
    case JsonRpcErrorCode.MethodNotFound:
    case JsonRpcErrorCode.NotFound:
      return 404;
    case JsonRpcErrorCode.Unauthorized:
      return 401;
    case JsonRpcErrorCode.Forbidden:
      return 403;
    case JsonRpcErrorCode.Conflict:
      return 409;
    case JsonRpcErrorCode.RateLimited:
      return 429;
    case JsonRpcErrorCode.Timeout:
      return 504;
    case JsonRpcErrorCode.ServiceUnavailable:
      return 503;
    default:
      return 500;
  }
}

/**
 * A centralized error handling middleware for Hono.
 * This function is registered with `app.onError()` and will catch any errors
 * thrown from preceding middleware or route handlers.
 *
 * @param err - The error that was thrown.
 * @param c - The Hono context object for the request.
 * @returns A Response object containing the formatted JSON-RPC error.
 */
export const httpErrorHandler = async (
  err: Error,
  c: Context<{
    Bindings: HonoNodeBindings;
    Variables: { requestId?: string | number | null };
  }>,
): Promise<Response> => {
  const context = requestContextService.createRequestContext({
    operation: "httpErrorHandler",
    path: c.req.path,
    method: c.req.method,
  });
  logOperationStart(context, "HTTP error handler invoked.");

  const handledError = ErrorHandler.handleError(err, {
    operation: "httpTransport",
    context,
  });

  const errorCode =
    handledError instanceof McpError
      ? handledError.code
      : JsonRpcErrorCode.InternalError;
  const status = toHttpCode(errorCode);

  logOperationStart(context, `Mapping error to HTTP status ${status}.`, {
    status,
    errorCode,
  });

  // Retrieve the request ID from the Hono context
  let requestId: string | number | null = null;
  try {
    // Use c.get() which handles the retrieval safely
    requestId = c.get("requestId") ?? null;
  } catch (_e) {
    // Log if retrieval fails, though unlikely
    logOperationStart(
      context,
      "Could not retrieve requestId from Hono context in error handler.",
    );
  }

  c.status(status);
  const errorResponse = {
    jsonrpc: "2.0",
    error: {
      code: errorCode,
      message: handledError.message,
    },
    id: requestId,
  };
  return c.json(errorResponse);
};
