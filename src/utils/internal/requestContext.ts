/**
 * @fileoverview Utilities for creating and managing request contexts.
 * A request context is an object carrying a unique ID, timestamp, and other
 * relevant data for logging, tracing, and processing.
 * @module src/utils/internal/requestContext
 */
import { trace } from "@opentelemetry/api";
import { generateShortAlphanumericId } from "../security/idGenerator.js";

/**
 * Defines the core structure for context information associated with a request or operation.
 * This is fundamental for logging, tracing, and passing operational data.
 */
export interface RequestContext {
  requestId: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Options for creating a new RequestContext.
 */
export interface CreateRequestContextOptions {
  /**
   * An optional parent context. If provided, the new context will inherit the
   * `requestId` and `traceId` from the parent, creating a logical link.
   */
  parentContext?: RequestContext | Record<string, unknown>;
  /**
   * Allows for arbitrary additional context information.
   */
  [key: string]: unknown;
}

/**
 * Creates a new {@link RequestContext} instance.
 * Each context is assigned a unique `requestId` and a current `timestamp`.
 * It automatically injects OpenTelemetry trace and span IDs if an active span exists.
 * If a `parentContext` is provided, it inherits the `requestId` for continuity.
 *
 * @param options - An optional object containing a `parentContext` and other
 *   key-value pairs to be included in the created request context.
 * @returns A new `RequestContext` object.
 */
export function createRequestContext(
  options: CreateRequestContextOptions = {},
): RequestContext {
  const { parentContext, ...additionalContext } = options;

  const baseRequestId =
    parentContext && typeof parentContext.requestId === "string"
      ? parentContext.requestId
      : generateShortAlphanumericId();

  const context: RequestContext = {
    requestId: baseRequestId,
    timestamp: new Date().toISOString(),
    ...additionalContext,
  };

  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    const spanContext = activeSpan.spanContext();
    context.traceId = spanContext.traceId;
    context.spanId = spanContext.spanId;
  } else if (parentContext && typeof parentContext.traceId === "string") {
    // Inherit traceId from parent if not in an active span
    context.traceId = parentContext.traceId;
  }

  return context;
}

/**
 * A service object for managing request context operations.
 */
export const requestContextService = {
  createRequestContext,
};
