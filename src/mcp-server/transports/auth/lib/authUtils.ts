/**
 * @fileoverview Provides utility functions for authorization, specifically for
 * checking token scopes against required permissions for a given operation.
 * @module src/mcp-server/transports/auth/core/authUtils
 */

import { JsonRpcErrorCode, McpError } from "@/types-global/errors.js";
import { logger, requestContextService } from "@/utils/index.js";
import { authContext } from "./authContext.js";

/**
 * Checks if the current authentication context contains all the specified scopes.
 * This function is designed to be called within tool or resource handlers to
 * enforce scope-based access control. It retrieves the authentication information
 * from `authContext` (AsyncLocalStorage).
 *
 * @param requiredScopes - An array of scope strings that are mandatory for the operation.
 * @throws {McpError} Throws an error with `BaseErrorCode.INTERNAL_ERROR` if the
 *   authentication context is missing, which indicates a server configuration issue.
 * @throws {McpError} Throws an error with `BaseErrorCode.FORBIDDEN` if one or
 *   more required scopes are not present in the validated token.
 */
export function withRequiredScopes(requiredScopes: string[]): void {
  const operationName = "withRequiredScopesCheck";
  const initialContext = requestContextService.createRequestContext({
    operation: operationName,
    requiredScopes,
  });

  logger.debug(initialContext, "Performing scope authorization check.");

  const store = authContext.getStore();

  if (!store || !store.authInfo) {
    logger.crit(
      initialContext,
      "Authentication context is missing in withRequiredScopes. This is a server configuration error.",
    );
    // This is a server-side logic error; the auth middleware should always populate this.
    throw new McpError(
      JsonRpcErrorCode.InternalError,
      "Authentication context is missing. This indicates a server configuration error.",
      {
        ...initialContext,
        error: "AuthStore not found in AsyncLocalStorage.",
      },
    );
  }

  const { scopes: grantedScopes, clientId, subject } = store.authInfo;
  const grantedScopeSet = new Set(grantedScopes);

  const missingScopes = requiredScopes.filter(
    (scope) => !grantedScopeSet.has(scope),
  );

  const finalContext = {
    ...initialContext,
    grantedScopes,
    clientId,
    subject,
  };

  if (missingScopes.length > 0) {
    const errorContext = { ...finalContext, missingScopes };
    logger.warning(
      errorContext,
      "Authorization failed: Missing required scopes.",
    );
    throw new McpError(
      JsonRpcErrorCode.Forbidden,
      `Insufficient permissions. Missing required scopes: ${missingScopes.join(", ")}`,
      errorContext,
    );
  }

  logger.debug(finalContext, "Scope authorization successful.");
}
