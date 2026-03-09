/**
 * @fileoverview Utilities for creating and managing request contexts.
 * A request context is an object carrying a unique ID, timestamp, and other
 * relevant data for logging, tracing, and processing. It supports context
 * propagation for distributed tracing.
 * @module src/utils/internal/requestContext
 */
import { trace } from '@opentelemetry/api';

import { authContext as alsAuthContext } from '@/mcp-server/transports/auth/lib/authContext.js';
import type { AuthInfo } from '@/mcp-server/transports/auth/lib/authTypes.js';
import { generateRequestContextId } from '@/utils/security/idGenerator.js';

/**
 * Defines the structure of the authentication-related context, typically
 * decoded from a JWT.
 *
 * This interface represents the processed authentication data that gets
 * attached to a RequestContext after token verification.
 */
export interface AuthContext {
  /** The client identifier from the token (cid or client_id claim). */
  clientId: string;
  /** An array of granted permissions (scopes). */
  scopes: string[];
  /** The subject (user) identifier. */
  sub: string;
  /** Optional tenant identifier for multi-tenancy support. */
  tenantId?: string;
  /** The original JWT/OAuth token string. */
  token: string;
  /** Other properties from the token payload. */
  [key: string]: unknown;
}

/**
 * Defines the core structure for context information associated with a request or operation.
 * This is fundamental for logging, tracing, and passing operational data.
 */
export interface RequestContext {
  /**
   * Optional authentication context, present if the request was authenticated.
   */
  auth?: AuthContext;
  /**
   * Unique ID for the context instance.
   * Used for log correlation and request tracing.
   */
  requestId: string;

  /**
   * The unique identifier for the tenant making the request.
   * This is essential for multi-tenancy and data isolation.
   */
  tenantId?: string;

  /**
   * ISO 8601 timestamp indicating when the context was created.
   */
  timestamp: string;

  /**
   * Allows arbitrary key-value pairs for specific context needs.
   * Using `unknown` promotes type-safe access.
   * Consumers must type-check/assert when accessing extended properties.
   */
  [key: string]: unknown;
}

/**
 * Parameters for creating a new request context.
 */
export interface CreateRequestContextParams {
  /**
   * An optional record of key-value pairs to be merged into the new context.
   * These will override any properties inherited from the parent context.
   */
  additionalContext?: Record<string, unknown>;

  /**
   * A descriptive name for the operation creating this context.
   * Useful for debugging and tracing.
   */
  operation?: string;
  /**
   * An optional parent context to inherit properties from, such as `requestId`.
   * This is key for propagating context in distributed systems.
   */
  parentContext?: Record<string, unknown> | RequestContext | undefined;

  /** Allows arbitrary key-value pairs for ad-hoc context properties. */
  [key: string]: unknown;
}

/**
 * Singleton-like service object for managing request context operations.
 * @private
 */
const requestContextServiceInstance = {
  /**
   * Creates a new {@link RequestContext} instance, supporting context propagation.
   *
   * OpenTelemetry trace and span IDs are automatically injected if an active span exists.
   *
   * @param params - Parameters for creating the context.
   * @returns A new `RequestContext` object.
   */
  createRequestContext(params: CreateRequestContextParams = {}): RequestContext {
    const { parentContext, additionalContext, operation, ...rest } = params;

    const inheritedContext =
      parentContext && typeof parentContext === 'object' ? { ...parentContext } : {};

    const authStore = alsAuthContext.getStore();
    const tenantIdFromAuth = authStore?.authInfo?.tenantId;

    const requestId =
      typeof inheritedContext.requestId === 'string' && inheritedContext.requestId
        ? inheritedContext.requestId
        : generateRequestContextId();
    const timestamp = new Date().toISOString();

    const extractTenantId = (obj: Record<string, unknown> | undefined): string | undefined =>
      obj != null && typeof obj.tenantId === 'string' ? obj.tenantId : undefined;

    const resolvedTenantId =
      extractTenantId(additionalContext) ??
      extractTenantId(rest as Record<string, unknown>) ??
      extractTenantId(inheritedContext) ??
      tenantIdFromAuth;

    // Strip system fields from additionalContext to prevent overwriting requestId/timestamp
    const {
      requestId: _r,
      timestamp: _t,
      ...safeAdditional
    } = additionalContext && typeof additionalContext === 'object' ? additionalContext : {};

    const context: RequestContext = {
      ...inheritedContext,
      ...rest, // Spread any other properties from the params object
      ...safeAdditional,
      requestId,
      timestamp,
      ...(resolvedTenantId ? { tenantId: resolvedTenantId } : {}),
      ...(operation && typeof operation === 'string' ? { operation } : {}),
    };

    // --- OpenTelemetry Integration ---
    const activeSpan = trace.getActiveSpan();
    if (activeSpan && typeof activeSpan.spanContext === 'function') {
      const spanContext = activeSpan.spanContext();
      if (spanContext) {
        context.traceId = spanContext.traceId;
        context.spanId = spanContext.spanId;
      }
    }
    // --- End OpenTelemetry Integration ---

    return context;
  },

  /**
   * Creates a new {@link RequestContext} enriched with authentication information.
   * This method populates the context with auth data from a validated token,
   * including tenant ID, client ID, scopes, and subject.
   *
   * **Note:** This method builds and returns a `RequestContext` object only.
   * It does NOT propagate auth into `AsyncLocalStorage`. ALS propagation is
   * handled by the auth middleware via `authContext.run()`. If you need
   * scope enforcement via `withRequiredScopes()`, ensure the call runs
   * inside the middleware's ALS continuation.
   *
   * @param authInfo - The validated authentication information from JWT/OAuth token.
   * @param parentContext - Optional parent context to inherit properties from.
   * @returns A new `RequestContext` object with auth information populated.
   *
   * @example
   * ```typescript
   * const authInfo = await jwtStrategy.verify(token);
   * const context = requestContextService.withAuthInfo(authInfo);
   * // context now includes: { requestId, timestamp, tenantId, auth: {...}, ... }
   * ```
   */
  withAuthInfo(
    authInfo: AuthInfo,
    parentContext?: Record<string, unknown> | RequestContext,
  ): RequestContext {
    const baseContext = this.createRequestContext({
      operation: 'withAuthInfo',
      parentContext,
      additionalContext: {
        tenantId: authInfo.tenantId,
      },
    });

    // Populate auth property with structured authentication context
    const authContext: AuthContext = {
      sub: authInfo.subject ?? authInfo.clientId,
      scopes: authInfo.scopes,
      clientId: authInfo.clientId,
      token: authInfo.token,
      ...(authInfo.tenantId ? { tenantId: authInfo.tenantId } : {}),
    };

    return {
      ...baseContext,
      auth: authContext,
    };
  },
};

/**
 * Primary export for request context functionalities.
 * This service provides methods to create and manage {@link RequestContext} instances,
 * which are essential for logging, tracing, and correlating operations.
 */
export const requestContextService = requestContextServiceInstance;
