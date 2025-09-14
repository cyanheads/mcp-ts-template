/**
 * @fileoverview Helpers for working with trace context across boundaries.
 * Builds W3C traceparent headers from RequestContext or the active span.
 * @module src/utils/telemetry/trace
 */
import { context as otContext, propagation, trace } from '@opentelemetry/api';

import type { RequestContext } from '@/utils/internal/requestContext.js';

/**
 * Builds a W3C `traceparent` header value from the provided RequestContext
 * or the active span if available. Falls back to sampled flag "01".
 */
export function buildTraceparent(ctx?: RequestContext): string | undefined {
  const traceId =
    (ctx?.traceId as string | undefined) ??
    trace.getActiveSpan()?.spanContext().traceId;
  const spanId =
    (ctx?.spanId as string | undefined) ??
    trace.getActiveSpan()?.spanContext().spanId;
  if (!traceId || !spanId) return undefined;
  // We do not currently read flags reliably from context; assume sampled
  return `00-${traceId}-${spanId}-01`;
}

/**
 * Injects the current active context into a carrier, returning it.
 * Useful for HTTP headers: pass an object and use resulting key/values.
 */
export function injectCurrentContextInto<T extends Record<string, unknown>>(
  carrier: T,
): T {
  propagation.inject(otContext.active(), carrier);
  return carrier;
}
