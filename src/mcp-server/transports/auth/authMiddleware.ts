/**
 * @fileoverview Defines a unified Hono middleware for authentication.
 * This middleware is strategy-agnostic. It extracts a Bearer token,
 * delegates verification to the provided authentication strategy, and
 * populates the async-local storage context with the resulting auth info.
 * @module src/mcp-server/transports/auth/authMiddleware
 */
import type { Context, Next } from "hono";
import { JsonRpcErrorCode, McpError } from "@/types-global/errors.js";
import type { HonoNodeBindings } from "@/mcp-server/transports/http/httpTypes.js";
import { ErrorHandler, logger, requestContextService } from "@/utils/index.js";
import { authContext } from "./lib/authContext.js";
import type { AuthStrategy } from "./strategies/authStrategy.js";

/**
 * Creates a Hono middleware function that enforces authentication using a given strategy.
 *
 * @param strategy - An instance of a class that implements the `AuthStrategy` interface.
 * @returns A Hono middleware function.
 */
export function createAuthMiddleware(strategy: AuthStrategy) {
  return async function authMiddleware(
    c: Context<{ Bindings: HonoNodeBindings }>,
    next: Next,
  ) {
    const context = requestContextService.createRequestContext({
      operation: "authMiddleware",
      method: c.req.method,
      path: c.req.path,
    });

    logger.debug(context, "Initiating authentication check.");

    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warning(context, "Authorization header missing or invalid.");
      throw new McpError(
        JsonRpcErrorCode.Unauthorized,
        "Missing or invalid Authorization header. Bearer scheme required.",
        context,
      );
    }

    const token = authHeader.substring(7);
    if (!token) {
      logger.warning(
        context,
        "Bearer token is missing from Authorization header.",
      );
      throw new McpError(
        JsonRpcErrorCode.Unauthorized,
        "Authentication token is missing.",
        context,
      );
    }

    logger.debug(
      context,
      "Extracted Bearer token, proceeding to verification.",
    );

    try {
      const authInfo = await strategy.verify(token);

      const authLogContext = {
        ...context,
        clientId: authInfo.clientId,
        subject: authInfo.subject,
        scopes: authInfo.scopes,
      };
      logger.info(
        authLogContext,
        "Authentication successful. Auth context populated.",
      );

      // Run the next middleware in the chain within the populated auth context.
      await authContext.run({ authInfo }, next);
    } catch (error) {
      // The strategy is expected to throw an McpError.
      // We re-throw it here to be caught by the global httpErrorHandler.
      logger.warning(
        {
          ...context,
          error: error as Error,
        },
        "Authentication verification failed.",
      );

      // Ensure consistent error handling
      throw ErrorHandler.handleError(error, {
        operation: "authMiddlewareVerification",
        context,
        rethrow: true, // Rethrow to be caught by Hono's global error handler
        errorCode: JsonRpcErrorCode.Unauthorized, // Default to unauthorized if not more specific
      });
    }
  };
}
