/**
 * @fileoverview Shared JWT claim parsing and AuthInfo construction.
 * Extracts and validates standard claims (clientId, scopes, subject, tenantId, expiresAt)
 * from a decoded JWT payload, producing a fully-formed AuthInfo object.
 * Used by both JWT and OAuth strategies to ensure consistent claim handling.
 * @module src/mcp-server/transports/auth/lib/claimParser
 */
import type { JWTPayload } from 'jose';

import type { AuthInfo } from '@/mcp-server/transports/auth/lib/authTypes.js';
import { McpError, unauthorized } from '@/types-global/errors.js';

/**
 * Extracts a list of scope strings from a JWT claim value, accepting both
 * array and space-delimited string forms. Non-string array entries cause
 * the claim to be ignored entirely. Empty-string entries are dropped.
 */
function extractStringScopes(value: unknown): string[] {
  if (Array.isArray(value) && value.every((s) => typeof s === 'string')) {
    return (value as string[]).filter((s) => s.length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(' ').filter(Boolean);
  }
  return [];
}

/**
 * Builds an {@link AuthInfo} from a raw token string and decoded JWT payload.
 *
 * Claim resolution order:
 * - **clientId**: `cid` (Okta) → `client_id` (OAuth 2.1 standard)
 * - **scopes**: union of `scp` (Okta, array), `scope` (standard, space-delimited string),
 *   and `mcp_tool_scopes` (custom claim for OIDC providers that cannot inject scopes
 *   into `scope` during the `authorization_code` flow — Authentik, Keycloak < 26.5,
 *   Zitadel). Operators add a property mapping returning
 *   `{"mcp_tool_scopes": "tool:foo:read tool:bar:write"}` (string or array form accepted).
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
    throw unauthorized("Invalid token: missing 'cid' or 'client_id' claim.");
  }

  const scopes = [
    ...extractStringScopes(payload.scp),
    ...extractStringScopes(payload.scope),
    ...extractStringScopes(payload.mcp_tool_scopes),
  ];

  if (scopes.length === 0) {
    throw unauthorized('Token must contain valid, non-empty scopes.');
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

  throw unauthorized(message);
}
