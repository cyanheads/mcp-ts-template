/**
 * @fileoverview Defines a unified Hono middleware for authentication.
 * This middleware is strategy-agnostic. It extracts a Bearer token,
 * delegates verification to the provided authentication strategy, and
 * populates the async-local storage context with the resulting auth info.
 * @module src/mcp-server/transports/auth/authMiddleware
 */
import type { HttpBindings } from "@hono/node-server";
import type { Context, Next } from "hono";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, requestContextService } from "../../../utils/index.js";
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
    c: Context<{ Bindings: HttpBindings }>,
    next: Next,
  ) {
    const context = requestContextService.createRequestContext({
      operation: "authMiddleware",
      method: c.req.method,
      path: c.req.path,
    });

    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new McpError(
        BaseErrorCode.UNAUTHORIZED,
        "Missing or invalid Authorization header. Bearer scheme required.",
        context,
      );
    }

    const token = authHeader.substring(7);
    if (!token) {
      throw new McpError(
        BaseErrorCode.UNAUTHORIZED,
        "Authentication token is missing.",
        context,
      );
    }

    try {
      const authInfo = await strategy.verify(token);

      logger.debug("Authentication successful. Auth context populated.", {
        ...context,
        clientId: authInfo.clientId,
        scopes: authInfo.scopes,
      });

      // Run the next middleware in the chain within the populated auth context.
      await authContext.run({ authInfo }, next);
    } catch (error) {
      // The strategy is expected to throw an McpError.
      // We re-throw it here to be caught by the global httpErrorHandler.
      logger.warning("Authentication verification failed.", {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}
