/**
 * @fileoverview Defines a unified Hono middleware for authentication.
 * This middleware is strategy-agnostic. It extracts a Bearer token,
 * delegates verification to the provided authentication strategy, and
 * populates the async-local storage context with the resulting auth info.
 *
 * Errors from the strategy propagate directly to the Hono global error
 * handler ({@link httpErrorHandler}), which handles OTel recording, logging,
 * and JSON-RPC response formatting.
 * @module src/mcp-server/transports/auth/authMiddleware
 */

import type { HttpBindings } from '@hono/node-server';
import { trace } from '@opentelemetry/api';
import type { Context, MiddlewareHandler, Next } from 'hono';

import { authContext } from '@/mcp-server/transports/auth/lib/authContext.js';
import type { AuthStrategy } from '@/mcp-server/transports/auth/strategies/authStrategy.js';
import { unauthorized } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

/**
 * Creates a Hono middleware function that enforces authentication using a given strategy.
 *
 * @param strategy - An instance of a class that implements the `AuthStrategy` interface.
 * @returns A Hono middleware function.
 */
export function createAuthMiddleware(
  strategy: AuthStrategy,
): MiddlewareHandler<{ Bindings: HttpBindings }> {
  return async function authMiddleware(c: Context<{ Bindings: HttpBindings }>, next: Next) {
    const context = requestContextService.createRequestContext({
      operation: 'authMiddleware',
      additionalContext: {
        method: c.req.method,
        path: c.req.path,
      },
    });

    logger.debug('Initiating authentication check.', context);

    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warning('Authorization header missing or invalid.', context);
      throw unauthorized('Missing or invalid Authorization header. Bearer scheme required.');
    }

    const token = authHeader.substring(7);
    if (!token) {
      logger.warning('Bearer token is missing from Authorization header.', context);
      throw unauthorized('Authentication token is missing.');
    }

    logger.debug('Extracted Bearer token, proceeding to verification.', context);

    // Strategy.verify() throws McpError on failure — errors propagate to httpErrorHandler.
    const authInfo = await strategy.verify(token);

    const authLogContext = {
      ...context,
      ...(authInfo.tenantId ? { tenantId: authInfo.tenantId } : {}),
      clientId: authInfo.clientId,
      subject: authInfo.subject,
      scopes: authInfo.scopes,
    };
    logger.info('Authentication successful. Auth context populated.', authLogContext);

    // Add authentication context to OpenTelemetry span for distributed tracing
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes({
        'auth.client_id': authInfo.clientId,
        'auth.tenant_id': authInfo.tenantId ?? 'none',
        'auth.scopes': authInfo.scopes.join(','),
        'auth.subject': authInfo.subject ?? 'unknown',
        'auth.method': 'bearer',
      });
    }

    // Run the next middleware in the chain within the populated auth context.
    await authContext.run({ authInfo }, next);
  };
}
