/**
 * @fileoverview Utilities for creating and managing request contexts.
 * A request context is an object carrying a unique ID, timestamp, and other
 * relevant data for logging, tracing, and processing. It supports context
 * propagation for distributed tracing.
 * @module src/utils/internal/requestContext
 */

import { trace } from "@opentelemetry/api";
import { generateUUID } from "../index.js";
import { logger } from "./logger.js";

/**
 * Defines the core structure for context information associated with a request or operation.
 * This is fundamental for logging, tracing, and passing operational data.
 */
export interface RequestContext {
  /**
   * Unique ID for the context instance.
   * Used for log correlation and request tracing.
   */
  requestId: string;

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
 * Configuration for the {@link requestContextService}.
 * Allows for future extensibility of service-wide settings.
 */
export interface ContextConfig {
  /** Custom configuration properties. Allows for arbitrary key-value pairs. */
  [key: string]: unknown;
}

/**
 * Represents a broader context for a specific operation or task.
 * It can optionally include a base {@link RequestContext} and other custom properties
 * relevant to the operation.
 */
export interface OperationContext {
  /** Optional base request context data, adhering to the `RequestContext` structure. */
  requestContext?: RequestContext;

  /** Allows for additional, custom properties specific to the operation. */
  [key: string]: unknown;
}

/**
 * Parameters for creating a new request context.
 */
export interface CreateRequestContextParams {
  /**
   * An optional parent context to inherit properties from, such as `requestId`.
   * This is key for propagating context in distributed systems.
   */
  parentContext?: Record<string, unknown> | RequestContext;

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
}

/**
 * Singleton-like service object for managing request context operations.
 * @private
 */
const requestContextServiceInstance = {
  /**
   * Internal configuration store for the service.
   */
  config: {} as ContextConfig,

  /**
   * Configures the request context service with new settings.
   * Merges the provided partial configuration with existing settings.
   *
   * @param config - A partial `ContextConfig` object containing settings to update or add.
   * @returns A shallow copy of the newly updated configuration.
   */
  configure(config: Partial<ContextConfig>): ContextConfig {
    this.config = {
      ...this.config,
      ...config,
    };
    const logContext = this.createRequestContext({
      operation: "RequestContextService.configure",
      additionalContext: { newConfigState: { ...this.config } },
    });
    logger.debug("RequestContextService configuration updated", logContext);
    return { ...this.config };
  },

  /**
   * Retrieves a shallow copy of the current service configuration.
   * This prevents direct mutation of the internal configuration state.
   *
   * @returns A shallow copy of the current `ContextConfig`.
   */
  getConfig(): ContextConfig {
    return { ...this.config };
  },

  /**
   * Creates a new {@link RequestContext} instance, supporting context propagation.
   * This function robustly handles two calling patterns:
   * 1. Passing a `CreateRequestContextParams` object: `createRequestContext({ parentContext: ..., additionalContext: ... })`
   * 2. Passing a plain object to be used as the context: `createRequestContext({ userId: '123', operation: '...' })`
   *
   * OpenTelemetry trace and span IDs are automatically injected if an active span exists.
   *
   * @param params - Parameters for creating the context.
   * @returns A new `RequestContext` object.
   */
  createRequestContext(
    params: CreateRequestContextParams | Record<string, unknown> = {},
  ): RequestContext {
    // Destructure known CreateRequestContextParams keys and capture the rest.
    // The 'rest' object will contain all properties that are NOT the special keys,
    // effectively capturing the direct context object when passed.
    const { parentContext, additionalContext, operation, ...rest } =
      params as CreateRequestContextParams;

    const inheritedContext =
      parentContext && typeof parentContext === "object"
        ? { ...parentContext }
        : {};

    const requestId =
      typeof inheritedContext.requestId === "string" &&
      inheritedContext.requestId
        ? inheritedContext.requestId
        : generateUUID();
    const timestamp = new Date().toISOString();

    const context: RequestContext = {
      ...inheritedContext,
      ...rest, // Spread any other properties from the params object
      requestId,
      timestamp,
      ...(additionalContext && typeof additionalContext === "object"
        ? additionalContext
        : {}),
      ...(operation && typeof operation === "string" ? { operation } : {}),
    };

    // --- OpenTelemetry Integration ---
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      context.traceId = spanContext.traceId;
      context.spanId = spanContext.spanId;
    }
    // --- End OpenTelemetry Integration ---

    return context;
  },
};

/**
 * Primary export for request context functionalities.
 * This service provides methods to create and manage {@link RequestContext} instances,
 * which are essential for logging, tracing, and correlating operations.
 */
export const requestContextService = requestContextServiceInstance;
