/**
 * @fileoverview Public API for dynamic scope checking in new-style handlers.
 * Use when auth scopes depend on runtime input (e.g., `team:${input.teamId}:write`).
 * For static scopes, prefer the `auth` property on the tool/resource definition.
 * @module src/mcp-server/transports/auth/lib/checkScopes
 */

import type { Context } from '@/context.js';
import { withRequiredScopes } from '@/mcp-server/transports/auth/lib/authUtils.js';

/**
 * Checks that the current request has the required auth scopes.
 * Throws `McpError(Forbidden)` if scopes are insufficient.
 * No-ops when auth is disabled (`MCP_AUTH_MODE=none`).
 * Throws `Unauthorized` when auth is enabled but no auth context exists.
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
  withRequiredScopes(requiredScopes, {
    requestId: ctx.requestId,
    timestamp: ctx.timestamp,
    operation: 'checkScopes',
    ...(ctx.tenantId ? { tenantId: ctx.tenantId } : {}),
    ...(ctx.traceId ? { traceId: ctx.traceId } : {}),
    ...(ctx.spanId ? { spanId: ctx.spanId } : {}),
  });
}
