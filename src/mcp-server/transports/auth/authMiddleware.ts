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
import { nowMs } from '@/utils/internal/performance.js';
import { requestContextService } from '@/utils/internal/requestContext.js';
import {
  ATTR_MCP_AUTH_FAILURE_REASON,
  ATTR_MCP_AUTH_METHOD,
  ATTR_MCP_AUTH_OUTCOME,
  ATTR_MCP_AUTH_SCOPES,
  ATTR_MCP_AUTH_SUBJECT,
  ATTR_MCP_CLIENT_ID,
  ATTR_MCP_TENANT_ID,
} from '@/utils/telemetry/attributes.js';
import { createCounter, createHistogram } from '@/utils/telemetry/metrics.js';

let authAttemptCounter: ReturnType<typeof createCounter> | undefined;
let authDuration: ReturnType<typeof createHistogram> | undefined;

function getAuthMetrics() {
  authAttemptCounter ??= createCounter(
    'mcp.auth.attempts',
    'Total authentication attempts',
    '{attempts}',
  );
  authDuration ??= createHistogram(
    'mcp.auth.duration',
    'Authentication verification duration',
    'ms',
  );
  return { authAttemptCounter, authDuration };
}

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

    const m = getAuthMetrics();
    const activeSpan = trace.getActiveSpan();

    const recordAuthEvent = (outcome: string, failureReason?: string, durationMs?: number) => {
      const counterAttrs: Record<string, string> = { [ATTR_MCP_AUTH_OUTCOME]: outcome };
      if (failureReason) counterAttrs[ATTR_MCP_AUTH_FAILURE_REASON] = failureReason;
      m.authAttemptCounter.add(1, counterAttrs);
      if (durationMs !== undefined) m.authDuration.record(durationMs, counterAttrs);

      const spanAttrs: Record<string, string> = {
        [ATTR_MCP_AUTH_METHOD]: 'bearer',
        [ATTR_MCP_AUTH_OUTCOME]: outcome,
      };
      if (failureReason) spanAttrs[ATTR_MCP_AUTH_FAILURE_REASON] = failureReason;
      activeSpan?.setAttributes(spanAttrs);
    };

    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warning('Authorization header missing or invalid.', context);
      recordAuthEvent('missing', 'missing_header');
      throw unauthorized('Missing or invalid Authorization header. Bearer scheme required.');
    }

    const token = authHeader.substring(7);
    if (!token) {
      logger.warning('Bearer token is missing from Authorization header.', context);
      recordAuthEvent('missing', 'missing_token');
      throw unauthorized('Authentication token is missing.');
    }

    logger.debug('Extracted Bearer token, proceeding to verification.', context);

    // Strategy.verify() throws McpError on failure — errors propagate to httpErrorHandler.
    const t0 = nowMs();
    let authInfo: Awaited<ReturnType<AuthStrategy['verify']>>;
    try {
      authInfo = await strategy.verify(token);
    } catch (err) {
      recordAuthEvent('failure', undefined, Math.round((nowMs() - t0) * 100) / 100);
      throw err;
    }
    const durationMs = Math.round((nowMs() - t0) * 100) / 100;
    recordAuthEvent('success', undefined, durationMs);

    const authLogContext = {
      ...context,
      ...(authInfo.tenantId ? { tenantId: authInfo.tenantId } : {}),
      clientId: authInfo.clientId,
      subject: authInfo.subject,
      scopes: authInfo.scopes,
    };
    logger.info('Authentication successful. Auth context populated.', authLogContext);

    // Add authentication identity to OpenTelemetry span for distributed tracing.
    // Scope values are redacted to avoid exposing the authorization model to tracing backends.
    activeSpan?.setAttributes({
      [ATTR_MCP_CLIENT_ID]: authInfo.clientId,
      [ATTR_MCP_TENANT_ID]: authInfo.tenantId ?? 'none',
      [ATTR_MCP_AUTH_SCOPES]: String(authInfo.scopes.length),
      [ATTR_MCP_AUTH_SUBJECT]: authInfo.subject ?? 'unknown',
    });

    // Run the next middleware in the chain within the populated auth context.
    await authContext.run({ authInfo }, next);
  };
}
