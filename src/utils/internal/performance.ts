/**
 * @fileoverview Performance measurement for tool, resource, and prompt execution.
 * Wraps handler logic with OpenTelemetry spans, metric counters/histograms,
 * and structured logs. Prompts get structured logs only (no spans/metrics)
 * since they are pure synchronous template functions.
 * @module src/utils/internal/performance
 */

import type { performance as PerfHooksPerformance } from 'node:perf_hooks';
import { SpanStatusCode, trace } from '@opentelemetry/api';

import { config } from '@/config/index.js';
import { McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';
import {
  ATTR_CODE_FUNCTION_NAME,
  ATTR_CODE_NAMESPACE,
  ATTR_MCP_RESOURCE_DURATION_MS,
  ATTR_MCP_RESOURCE_ERROR_CODE,
  ATTR_MCP_RESOURCE_MIME_TYPE,
  ATTR_MCP_RESOURCE_SIZE_BYTES,
  ATTR_MCP_RESOURCE_SUCCESS,
  ATTR_MCP_RESOURCE_URI,
  ATTR_MCP_TOOL_DURATION_MS,
  ATTR_MCP_TOOL_ERROR_CODE,
  ATTR_MCP_TOOL_INPUT_BYTES,
  ATTR_MCP_TOOL_NAME,
  ATTR_MCP_TOOL_OUTPUT_BYTES,
  ATTR_MCP_TOOL_SUCCESS,
} from '@/utils/telemetry/attributes.js';
import { createCounter, createHistogram, createUpDownCounter } from '@/utils/telemetry/metrics.js';

// OTel metric instruments for tool execution (lazy-initialized on first use)
let toolCallCounter: ReturnType<typeof createCounter> | undefined;
let toolCallDuration: ReturnType<typeof createHistogram> | undefined;
let toolCallErrors: ReturnType<typeof createCounter> | undefined;
let activeRequests: ReturnType<typeof createUpDownCounter> | undefined;

function getToolMetrics() {
  toolCallCounter ??= createCounter('mcp.tool.calls', 'Total MCP tool invocations', '{calls}');
  toolCallDuration ??= createHistogram('mcp.tool.duration', 'MCP tool execution duration', 'ms');
  toolCallErrors ??= createCounter('mcp.tool.errors', 'Total MCP tool errors', '{errors}');
  return { toolCallCounter, toolCallDuration, toolCallErrors };
}

function getActiveRequestsGauge() {
  activeRequests ??= createUpDownCounter(
    'mcp.requests.active',
    'Number of in-flight tool and resource handler executions',
    '{requests}',
  );
  return activeRequests;
}

// Environment-aware high-resolution timer
let performanceNow: () => number = () => Date.now(); // Fallback

/**
 * Dynamically loads Node's `perf_hooks` module.
 * Exposed as a named export so tests can inject a mock loader into
 * {@link initHighResTimer} without patching the dynamic import machinery.
 *
 * @returns A promise resolving to the `perf_hooks` module shape (just the `performance` export).
 */
export async function loadPerfHooks(): Promise<{
  performance: typeof PerfHooksPerformance;
}> {
  return await (import('node:perf_hooks') as Promise<{
    performance: typeof PerfHooksPerformance;
  }>);
}

/**
 * Initializes the module-level high-resolution timer used by {@link nowMs}.
 *
 * Resolution priority:
 * 1. `globalThis.performance.now` — available in Cloudflare Workers and modern browsers.
 * 2. `node:perf_hooks` `performance.now` — loaded dynamically to stay Workers-compatible.
 * 3. `Date.now()` — millisecond-precision fallback; a warning is logged when this path is taken.
 *
 * Must be called once during server startup (before any tool executions) to ensure
 * sub-millisecond timing accuracy. Subsequent calls are safe but no-ops in practice
 * because the module-level `performanceNow` closure is overwritten each time.
 *
 * @param perfLoader - Optional override for the `perf_hooks` import; defaults to
 *   {@link loadPerfHooks}. Inject a mock here in unit tests.
 * @returns A promise that resolves once the timer is ready.
 */
export async function initHighResTimer(
  perfLoader: typeof loadPerfHooks = loadPerfHooks,
): Promise<void> {
  const globalWithPerf = globalThis as {
    performance?: { now: () => number };
  };

  if (typeof globalWithPerf.performance?.now === 'function') {
    const perf = globalWithPerf.performance;
    performanceNow = () => perf.now();
  } else {
    try {
      const { performance: nodePerformance } = await perfLoader();
      performanceNow = () => nodePerformance.now();
    } catch (_e) {
      performanceNow = () => Date.now();
      logger.warning(
        'Could not import perf_hooks, falling back to Date.now() for performance timing.',
      );
    }
  }
}

/**
 * Returns the current time in milliseconds using the highest-resolution timer
 * available in this environment.
 *
 * The precision depends on which timer was selected by {@link initHighResTimer}:
 * sub-millisecond after a successful init, millisecond-granular otherwise.
 * The returned value is suitable for computing durations but its epoch origin
 * is implementation-defined — do not treat it as a wall-clock timestamp.
 *
 * @returns Current time in milliseconds.
 */
export const nowMs = (): number => performanceNow();

// Module-level TextEncoder singleton (stateless, safe to reuse)
let cachedEncoder: TextEncoder | undefined;
function getEncoder(): TextEncoder {
  cachedEncoder ??= new TextEncoder();
  return cachedEncoder;
}

const toBytes = (payload: unknown): number => {
  if (payload == null) return 0;
  try {
    const json = JSON.stringify(payload);
    // Prefer Buffer when available (Node), otherwise TextEncoder (Web/Workers)
    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') {
      return Buffer.byteLength(json, 'utf8');
    }
    if (typeof TextEncoder !== 'undefined') {
      return getEncoder().encode(json).length;
    }
    return json.length;
  } catch {
    return 0;
  }
};

/**
 * Wraps a tool's logic function with observability: an OpenTelemetry span,
 * OTel metric counters/histogram, payload size capture, and structured log.
 *
 * The caller supplies the raw tool logic as `toolLogicFn`; this function handles
 * all instrumentation so tool handlers stay free of telemetry boilerplate.
 *
 * On success the resolved value is passed through transparently.
 * On failure the error is re-thrown after being recorded on the span and metrics;
 * `McpError` instances surface their numeric `code` as the error code attribute.
 *
 * @template T - The resolved type of the tool's return value.
 * @param toolLogicFn - Zero-argument async function containing the tool's business logic.
 * @param context - Request context extended with `toolName`; used for span/log correlation.
 * @param inputPayload - The raw input object passed to the tool, serialized to compute byte size.
 * @returns A promise that resolves with the tool's return value or rejects with the original error.
 */
export async function measureToolExecution<T>(
  toolLogicFn: () => Promise<T>,
  context: RequestContext & { toolName: string },
  inputPayload: unknown,
): Promise<T> {
  const tracer = trace.getTracer(
    config.openTelemetry.serviceName,
    config.openTelemetry.serviceVersion,
  );

  const { toolName } = context;

  return await tracer.startActiveSpan(`tool_execution:${toolName}` as const, async (span) => {
    const activeGauge = getActiveRequestsGauge();
    activeGauge.add(1);

    const t0 = nowMs();
    const inputBytes = toBytes(inputPayload);
    span.setAttributes({
      [ATTR_CODE_FUNCTION_NAME]: toolName,
      [ATTR_CODE_NAMESPACE]: 'mcp-tools',
      [ATTR_MCP_TOOL_INPUT_BYTES]: inputBytes,
    });

    let ok = false;
    let errorCode: string | undefined;
    let outputBytes = 0;

    try {
      const result = await toolLogicFn();
      ok = true;
      outputBytes = toBytes(result);
      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute(ATTR_MCP_TOOL_OUTPUT_BYTES, outputBytes);
      return result;
    } catch (err) {
      if (err instanceof McpError) errorCode = String(err.code);
      else if (err instanceof Error) errorCode = 'UNHANDLED_ERROR';
      else errorCode = 'UNKNOWN_ERROR';

      if (err instanceof Error) span.recordException(err);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      activeGauge.add(-1);
      const t1 = nowMs();
      const durationMs = Math.round((t1 - t0) * 100) / 100;

      span.setAttributes({
        [ATTR_MCP_TOOL_DURATION_MS]: durationMs,
        [ATTR_MCP_TOOL_SUCCESS]: ok,
      });
      if (errorCode) span.setAttribute(ATTR_MCP_TOOL_ERROR_CODE, errorCode);
      span.end();

      // Record to OTel metric instruments (durable across restarts)
      const m = getToolMetrics();
      const metricAttrs = { [ATTR_MCP_TOOL_NAME]: toolName, [ATTR_MCP_TOOL_SUCCESS]: ok };
      m.toolCallCounter.add(1, metricAttrs);
      m.toolCallDuration.record(durationMs, metricAttrs);
      if (!ok) m.toolCallErrors.add(1, { [ATTR_MCP_TOOL_NAME]: toolName });

      logger.info('Tool execution finished.', {
        ...context,
        metrics: {
          durationMs,
          isSuccess: ok,
          errorCode,
          inputBytes,
          outputBytes,
        },
      });
    }
  });
}

// ==========================================================================
// Resource execution measurement
// ==========================================================================

let resourceReadCounter: ReturnType<typeof createCounter> | undefined;
let resourceReadDuration: ReturnType<typeof createHistogram> | undefined;
let resourceReadErrors: ReturnType<typeof createCounter> | undefined;

function getResourceMetrics() {
  resourceReadCounter ??= createCounter(
    'mcp.resource.reads',
    'Total MCP resource read invocations',
    '{reads}',
  );
  resourceReadDuration ??= createHistogram(
    'mcp.resource.duration',
    'MCP resource read execution duration',
    'ms',
  );
  resourceReadErrors ??= createCounter(
    'mcp.resource.errors',
    'Total MCP resource read errors',
    '{errors}',
  );
  return { resourceReadCounter, resourceReadDuration, resourceReadErrors };
}

/**
 * Wraps a resource handler with observability: OTel span, metric counters/histogram,
 * and a structured log. Mirrors {@link measureToolExecution} but tuned for resource reads.
 *
 * @template T - The resolved type of the resource handler's return value.
 * @param resourceLogicFn - Zero-argument async function containing the resource handler.
 * @param context - Request context extended with `resourceName`; used for span/log correlation.
 * @param meta - Resource metadata: URI and MIME type for span attributes.
 * @returns A promise that resolves with the handler's return value or rejects with the original error.
 */
export async function measureResourceExecution<T>(
  resourceLogicFn: () => Promise<T>,
  context: RequestContext & { resourceName: string },
  meta: { uri: string; mimeType: string },
): Promise<T> {
  const tracer = trace.getTracer(
    config.openTelemetry.serviceName,
    config.openTelemetry.serviceVersion,
  );

  const { resourceName } = context;

  return await tracer.startActiveSpan(`resource_read:${resourceName}` as const, async (span) => {
    const activeGauge = getActiveRequestsGauge();
    activeGauge.add(1);
    const t0 = nowMs();

    span.setAttributes({
      [ATTR_CODE_FUNCTION_NAME]: resourceName,
      [ATTR_CODE_NAMESPACE]: 'mcp-resources',
      [ATTR_MCP_RESOURCE_URI]: meta.uri,
      [ATTR_MCP_RESOURCE_MIME_TYPE]: meta.mimeType,
    });

    let ok = false;
    let errorCode: string | undefined;
    let outputBytes = 0;

    try {
      const result = await resourceLogicFn();
      ok = true;
      outputBytes = toBytes(result);
      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute(ATTR_MCP_RESOURCE_SIZE_BYTES, outputBytes);
      return result;
    } catch (err) {
      if (err instanceof McpError) errorCode = String(err.code);
      else if (err instanceof Error) errorCode = 'UNHANDLED_ERROR';
      else errorCode = 'UNKNOWN_ERROR';

      if (err instanceof Error) span.recordException(err);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      activeGauge.add(-1);
      const t1 = nowMs();
      const durationMs = Math.round((t1 - t0) * 100) / 100;

      span.setAttributes({
        [ATTR_MCP_RESOURCE_DURATION_MS]: durationMs,
        [ATTR_MCP_RESOURCE_SUCCESS]: ok,
      });
      if (errorCode) span.setAttribute(ATTR_MCP_RESOURCE_ERROR_CODE, errorCode);
      span.end();

      const m = getResourceMetrics();
      const metricAttrs = { [ATTR_MCP_RESOURCE_URI]: meta.uri, [ATTR_MCP_RESOURCE_SUCCESS]: ok };
      m.resourceReadCounter.add(1, metricAttrs);
      m.resourceReadDuration.record(durationMs, metricAttrs);
      if (!ok) m.resourceReadErrors.add(1, { [ATTR_MCP_RESOURCE_URI]: meta.uri });

      logger.info('Resource read finished.', {
        ...context,
        metrics: {
          durationMs,
          isSuccess: ok,
          errorCode,
          outputBytes,
          uri: meta.uri,
          mimeType: meta.mimeType,
        },
      });
    }
  });
}

// ==========================================================================
// Prompt generation measurement (structured log only — no spans/metrics)
// ==========================================================================

/**
 * Wraps a prompt generate function with a structured log for duration tracking.
 * Prompts are pure template functions with no I/O, so they don't warrant
 * OTel spans or metric instruments — a structured log is sufficient.
 *
 * @template T - The resolved type of the prompt generate function's return value.
 * @param promptLogicFn - Zero-argument async function containing the prompt's generate logic.
 * @param context - Request context extended with `promptName`.
 * @returns A promise that resolves with the generate result or rejects with the original error.
 */
export async function measurePromptGeneration<T>(
  promptLogicFn: () => Promise<T>,
  context: RequestContext & { promptName: string },
): Promise<T> {
  const t0 = nowMs();
  let ok = false;

  try {
    const result = await promptLogicFn();
    ok = true;
    return result;
  } finally {
    const durationMs = Math.round((nowMs() - t0) * 100) / 100;
    const logFn = ok ? logger.info : logger.error;
    logFn.call(logger, `Prompt generation ${ok ? 'finished' : 'failed'}.`, {
      ...context,
      metrics: { durationMs, isSuccess: ok },
    });
  }
}
