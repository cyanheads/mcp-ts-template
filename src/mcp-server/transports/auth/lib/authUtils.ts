/**
 * @fileoverview Provides utility functions for authorization, specifically for
 * checking token scopes against required permissions for a given operation.
 * @module src/mcp-server/transports/auth/core/authUtils
 */

import { BaseErrorCode, McpError } from "../../../../types-global/errors.js";
import { logger, requestContextService } from "../../../../utils/index.js";
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
  const store = authContext.getStore();

  if (!store || !store.authInfo) {
    // This is a server-side logic error; the auth middleware should always populate this.
    throw new McpError(
      BaseErrorCode.INTERNAL_ERROR,
      "Authentication context is missing. This indicates a server configuration error.",
      requestContextService.createRequestContext({
        operation: "withRequiredScopesCheck",
        error: "AuthStore not found in AsyncLocalStorage.",
      }),
    );
  }

  const { scopes: grantedScopes, clientId } = store.authInfo;
  const grantedScopeSet = new Set(grantedScopes);

  const missingScopes = requiredScopes.filter(
    (scope) => !grantedScopeSet.has(scope),
  );

  if (missingScopes.length > 0) {
    const context = requestContextService.createRequestContext({
      operation: "withRequiredScopesCheck",
      required: requiredScopes,
      granted: grantedScopes,
      missing: missingScopes,
      clientId: clientId,
      subject: store.authInfo.subject,
    });
    logger.warning("Authorization failed: Missing required scopes.", context);
    throw new McpError(
      BaseErrorCode.FORBIDDEN,
      `Insufficient permissions. Missing required scopes: ${missingScopes.join(", ")}`,
      { requiredScopes, missingScopes },
    );
  }
}
