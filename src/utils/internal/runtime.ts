/**
 * @fileoverview Runtime capability detection for multi-environment support.
 * Detects presence of Node features, Web/Workers APIs, and common globals.
 * @module src/utils/internal/runtime
 */

/**
 * Snapshot of runtime feature availability detected at module load time.
 * All fields are booleans computed once via safe feature-detection; they never
 * throw and never change after the module is first imported.
 *
 * Note: `isNode` and `isWorkerLike` can both be `true` simultaneously when a
 * Worker runtime exposes a Node-compatible `process` global (e.g., Cloudflare
 * Workers with the `nodejs_compat` flag). Gate Node-only filesystem and
 * transport features on `isNode && !isWorkerLike`.
 */
export interface RuntimeCapabilities {
  /** True when the Node.js `Buffer` global is available. */
  hasBuffer: boolean;
  /** True when `globalThis.performance.now` is a callable function. */
  hasPerformanceNow: boolean;
  /** True when the `process` global is defined (Node.js, Bun, or some bundled envs). */
  hasProcess: boolean;
  /** True when `TextEncoder` is available on `globalThis`. */
  hasTextEncoder: boolean;
  /** True when running in a browser main thread (has `window`, not a Worker or Node). */
  isBrowserLike: boolean;
  /**
   * True when running under Bun.
   * Bun sets both `process.versions.node` and `process.versions.bun`,
   * so `isNode` is also true in Bun environments.
   */
  isBun: boolean;
  /**
   * True when `process.versions.node` is a string. This is true in Node.js
   * and Bun, and also in Cloudflare Workers with the `nodejs_compat` flag.
   * Use `isNode && !isWorkerLike` to gate code that requires a real Node
   * runtime (e.g., `pino/file` transports, `node:worker_threads`).
   */
  isNode: boolean;
  /**
   * True when running inside a Cloudflare Worker or a Web Worker. Detected
   * via `navigator.userAgent === 'Cloudflare-Workers'` (canonical for CF
   * Workers with the `global_navigator` flag, auto-enabled on recent
   * compatibility dates) with a `WorkerGlobalScope` fallback for other
   * worker environments.
   */
  isWorkerLike: boolean;
}

// Best-effort static detection without throwing in restricted envs
const safeHas = (key: string): boolean => {
  try {
    // @ts-expect-error index access on globalThis
    return typeof globalThis[key] !== 'undefined';
  } catch {
    return false;
  }
};

/**
 * Safely checks if process.versions.node exists and is a string.
 * Uses try-catch to handle environments where property access might be restricted.
 */
const hasNodeVersion = (): boolean => {
  try {
    return (
      typeof process !== 'undefined' &&
      typeof process.versions === 'object' &&
      process.versions !== null &&
      typeof process.versions.node === 'string'
    );
  } catch {
    return false;
  }
};

/**
 * Safely checks if globalThis.performance.now is a function.
 * Uses try-catch to handle environments where property access might be restricted.
 */
const hasPerformanceNowFunction = (): boolean => {
  try {
    const perf = (globalThis as { performance?: { now?: unknown } }).performance;
    return typeof perf === 'object' && perf !== null && typeof perf.now === 'function';
  } catch {
    return false;
  }
};

const isNode = hasNodeVersion();
const isBun = isNode && typeof process?.versions?.bun === 'string';
const hasProcess = typeof process !== 'undefined';
const hasBuffer = typeof Buffer !== 'undefined';
const hasTextEncoder = safeHas('TextEncoder');
const hasPerformanceNow = hasPerformanceNowFunction();

/**
 * Safely checks if WorkerGlobalScope exists.
 * Web Workers and some non-CF worker environments expose this; Cloudflare
 * Workers under `nodejs_compat` do not.
 */
const hasWorkerGlobalScope = (): boolean => {
  try {
    return 'WorkerGlobalScope' in globalThis;
  } catch {
    return false;
  }
};

/**
 * Safely checks if `navigator.userAgent === 'Cloudflare-Workers'`.
 * Canonical CF detection (works regardless of `nodejs_compat`) when the
 * `global_navigator` flag is enabled — auto-enabled on recent compat dates.
 */
const hasCloudflareWorkerNavigator = (): boolean => {
  try {
    return (
      (globalThis as { navigator?: { userAgent?: unknown } }).navigator?.userAgent ===
      'Cloudflare-Workers'
    );
  } catch {
    return false;
  }
};

// `isWorkerLike` is independent of `isNode`: under `nodejs_compat` both are true.
const isWorkerLike = hasCloudflareWorkerNavigator() || hasWorkerGlobalScope();
const isBrowserLike = !isNode && !isWorkerLike && safeHas('window');

/**
 * Singleton snapshot of runtime capabilities for the current environment.
 * Computed once at module load; safe to read at any time without async.
 *
 * @example
 * ```typescript
 * import { runtimeCaps } from './runtime.js';
 *
 * if (runtimeCaps.hasBuffer) {
 *   // Node.js / Bun path — use Buffer for encoding
 * } else {
 *   // Worker / browser path — use Web APIs
 * }
 * ```
 */
export const runtimeCaps: RuntimeCapabilities = {
  isNode,
  isBun,
  isWorkerLike,
  isBrowserLike,
  hasProcess,
  hasBuffer,
  hasTextEncoder,
  hasPerformanceNow,
};
