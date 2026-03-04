/**
 * @fileoverview Shared JWT claim parsing and AuthInfo construction.
 * Extracts and validates standard claims (clientId, scopes, subject, tenantId, expiresAt)
 * from a decoded JWT payload, producing a fully-formed AuthInfo object.
 * Used by both JWT and OAuth strategies to ensure consistent claim handling.
 * @module src/mcp-server/transports/auth/lib/claimParser
 */
import type { JWTPayload } from 'jose';

import type { AuthInfo } from '@/mcp-server/transports/auth/lib/authTypes.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

/**
 * Builds an {@link AuthInfo} from a raw token string and decoded JWT payload.
 *
 * Claim resolution order:
 * - **clientId**: `cid` (Okta) → `client_id` (OAuth 2.1 standard)
 * - **scopes**: `scp` (Okta, array) → `scope` (standard, space-delimited string)
 * - **subject**: `sub` (standard)
 * - **tenantId**: `tid` (Azure AD / custom)
 * - **expiresAt**: `exp` (standard, seconds since epoch)
 *
 * @throws {McpError} `Unauthorized` if `clientId` or `scopes` are missing/empty.
 */
export function buildAuthInfoFromClaims(token: string, payload: JWTPayload): AuthInfo {
  const clientId =
    typeof payload.cid === 'string'
      ? payload.cid
      : typeof payload.client_id === 'string'
        ? payload.client_id
        : undefined;

  if (!clientId) {
    throw new McpError(
      JsonRpcErrorCode.Unauthorized,
      "Invalid token: missing 'cid' or 'client_id' claim.",
    );
  }

  let scopes: string[] = [];
  if (Array.isArray(payload.scp) && payload.scp.every((s) => typeof s === 'string')) {
    scopes = payload.scp;
  } else if (typeof payload.scope === 'string' && payload.scope.trim()) {
    scopes = payload.scope.split(' ').filter(Boolean);
  }

  if (scopes.length === 0) {
    throw new McpError(
      JsonRpcErrorCode.Unauthorized,
      'Token must contain valid, non-empty scopes.',
    );
  }

  return {
    token,
    clientId,
    scopes,
    ...(typeof payload.sub === 'string' && { subject: payload.sub }),
    ...(typeof payload.tid === 'string' && { tenantId: payload.tid }),
    ...(typeof payload.exp === 'number' && { expiresAt: payload.exp }),
  };
}

/**
 * Handles errors thrown by `jose` verification functions.
 * Rethrows {@link McpError} instances as-is and wraps other errors
 * (e.g. `JWTExpired`, `JWSSignatureVerificationFailed`) in an
 * `Unauthorized` McpError.
 *
 * @param error - The caught error from a jose verify call.
 * @param fallbackMessage - Message used when the error is not a recognized jose type.
 * @throws Always throws — either the original McpError or a new Unauthorized McpError.
 */
export function handleJoseVerifyError(error: unknown, fallbackMessage: string): never {
  if (error instanceof McpError) throw error;

  const message =
    error instanceof Error && error.name === 'JWTExpired' ? 'Token has expired.' : fallbackMessage;

  throw new McpError(JsonRpcErrorCode.Unauthorized, message);
}
