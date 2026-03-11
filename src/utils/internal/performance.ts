/**
 * @fileoverview Performance utility for tool execution with modern observability.
 * Wraps tool logic to measure duration, payload sizes, and memory usage, and
 * records results to OpenTelemetry plus structured logs. No manual spans beyond
 * the single wrapper span here per project guidelines.
 * @module src/utils/internal/performance
 */

import type { performance as PerfHooksPerformance } from 'node:perf_hooks';
import { SpanStatusCode, trace } from '@opentelemetry/api';

import { config } from '@/config/index.js';
import { McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';
import { createCounter, createHistogram } from '@/utils/telemetry/metrics.js';
import {
  ATTR_CODE_FUNCTION,
  ATTR_CODE_NAMESPACE,
  ATTR_MCP_TOOL_DURATION_MS,
  ATTR_MCP_TOOL_ERROR_CODE,
  ATTR_MCP_TOOL_INPUT_BYTES,
  ATTR_MCP_TOOL_MEMORY_HEAP_USED_AFTER,
  ATTR_MCP_TOOL_MEMORY_HEAP_USED_BEFORE,
  ATTR_MCP_TOOL_MEMORY_HEAP_USED_DELTA,
  ATTR_MCP_TOOL_MEMORY_RSS_AFTER,
  ATTR_MCP_TOOL_MEMORY_RSS_BEFORE,
  ATTR_MCP_TOOL_MEMORY_RSS_DELTA,
  ATTR_MCP_TOOL_NAME,
  ATTR_MCP_TOOL_OUTPUT_BYTES,
  ATTR_MCP_TOOL_SUCCESS,
} from '@/utils/telemetry/semconv.js';

// OTel metric instruments for tool execution (lazy-initialized on first use)
let toolCallCounter: ReturnType<typeof createCounter> | undefined;
let toolCallDuration: ReturnType<typeof createHistogram> | undefined;
let toolCallErrors: ReturnType<typeof createCounter> | undefined;

function getToolMetrics() {
  toolCallCounter ??= createCounter('mcp.tool.calls', 'Total MCP tool invocations', '{calls}');
  toolCallDuration ??= createHistogram('mcp.tool.duration', 'MCP tool execution duration', 'ms');
  toolCallErrors ??= createCounter('mcp.tool.errors', 'Total MCP tool errors', '{errors}');
  return { toolCallCounter, toolCallDuration, toolCallErrors };
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
  // Use a type assertion to safely access `performance` on `globalThis`,
  // which is present in browser-like environments (e.g., Cloudflare Workers)
  // but not in Node.js's default global type.
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

const toBytes = (payload: unknown): number => {
  if (payload == null) return 0;
  try {
    const json = JSON.stringify(payload);
    // Prefer Buffer when available (Node), otherwise TextEncoder (Web/Workers)
    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') {
      return Buffer.byteLength(json, 'utf8');
    }
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(json).length;
    }
    return json.length;
  } catch {
    return 0;
  }
};

const zeroMemory: NodeJS.MemoryUsage = {
  rss: 0,
  heapUsed: 0,
  heapTotal: 0,
  external: 0,
  arrayBuffers: 0,
};

const getMemoryUsage = (): NodeJS.MemoryUsage =>
  typeof process !== 'undefined' && typeof process.memoryUsage === 'function'
    ? process.memoryUsage()
    : zeroMemory;

/**
 * Wraps a tool's logic function with full observability: an OpenTelemetry span,
 * OTel metric counters/histogram, structured log, and memory/payload size capture.
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
 *
 * @example
 * ```typescript
 * const result = await measureToolExecution(
 *   () => myToolHandler(parsedInput),
 *   { ...requestContext, toolName: 'my_tool' },
 *   parsedInput,
 * );
 * ```
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
    // Pre-capture lightweight metrics
    const memBefore = getMemoryUsage();
    const t0 = nowMs();

    span.setAttributes({
      [ATTR_CODE_FUNCTION]: toolName,
      [ATTR_CODE_NAMESPACE]: 'mcp-tools',
      [ATTR_MCP_TOOL_INPUT_BYTES]: toBytes(inputPayload),
      [ATTR_MCP_TOOL_MEMORY_RSS_BEFORE]: memBefore.rss,
      [ATTR_MCP_TOOL_MEMORY_HEAP_USED_BEFORE]: memBefore.heapUsed,
    });

    let ok = false;
    let errorCode: string | undefined;
    let output: T | undefined;

    try {
      const result = await toolLogicFn();
      ok = true;
      output = result;
      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute(ATTR_MCP_TOOL_OUTPUT_BYTES, toBytes(output));
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
      const t1 = nowMs();
      const durationMs = Number((t1 - t0).toFixed(2));
      const memAfter = getMemoryUsage();

      const rssDelta = memAfter.rss - memBefore.rss;
      const heapUsedDelta = memAfter.heapUsed - memBefore.heapUsed;

      span.setAttributes({
        [ATTR_MCP_TOOL_DURATION_MS]: durationMs,
        [ATTR_MCP_TOOL_SUCCESS]: ok,
        [ATTR_MCP_TOOL_MEMORY_RSS_AFTER]: memAfter.rss,
        [ATTR_MCP_TOOL_MEMORY_HEAP_USED_AFTER]: memAfter.heapUsed,
        [ATTR_MCP_TOOL_MEMORY_RSS_DELTA]: rssDelta,
        [ATTR_MCP_TOOL_MEMORY_HEAP_USED_DELTA]: heapUsedDelta,
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
          inputBytes: toBytes(inputPayload),
          outputBytes: toBytes(output),
          memory: {
            rss: {
              before: memBefore.rss,
              after: memAfter.rss,
              delta: rssDelta,
            },
            heapUsed: {
              before: memBefore.heapUsed,
              after: memAfter.heapUsed,
              delta: heapUsedDelta,
            },
          },
        },
      });
    }
  });
}
