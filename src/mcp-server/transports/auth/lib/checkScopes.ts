/**
 * @fileoverview Public API for dynamic scope checking in new-style handlers.
 * Use when auth scopes depend on runtime input (e.g., `team:${input.teamId}:write`).
 * For static scopes, prefer the `auth` property on the tool/resource definition.
 * @module src/mcp-server/transports/auth/lib/checkScopes
 */

import { config } from '@/config/index.js';
import type { Context } from '@/core/context.js';
import { forbidden, unauthorized } from '@/types-global/errors.js';

/**
 * Checks that the current request has the required auth scopes by reading
 * directly from `ctx.auth`. Throws `McpError(Forbidden)` if scopes are
 * insufficient. No-ops when auth is disabled (`MCP_AUTH_MODE=none`).
 * Throws `Unauthorized` when auth is enabled but `ctx.auth` is absent.
 *
 * @example
 * ```ts
 * import { checkScopes } from '@cyanheads/mcp-ts-core/auth';
 *
 * handler: async (input, ctx) => {
 *   checkScopes(ctx, [`team:${input.teamId}:write`]);
 *   // ...
 * },
 * ```
 */
export function checkScopes(ctx: Context, requiredScopes: string[]): void {
  if (config.mcpAuthMode === 'none') {
    return;
  }

  if (!ctx.auth) {
    throw unauthorized('Authentication required but no auth context was established.', {
      requiredScopes,
    });
  }

  const grantedScopeSet = new Set(ctx.auth.scopes);
  const missingScopes = requiredScopes.filter((scope) => !grantedScopeSet.has(scope));

  if (missingScopes.length > 0) {
    ctx.log.warning('Authorization failed: missing required scopes.', {
      requiredScopes,
      missingScopes,
    });
    throw forbidden(
      `Insufficient permissions. Missing required scopes: ${missingScopes.join(', ')}`,
      { requiredScopes, missingScopes },
    );
  }
}
