/**
 * @fileoverview Runtime capability detection for multi-environment support.
 * Detects presence of Node features, Web/Workers APIs, and common globals.
 * @module src/utils/internal/runtime
 */

/**
 * Snapshot of runtime feature availability detected at module load time.
 * All fields are booleans computed once via safe feature-detection; they never
 * throw and never change after the module is first imported.
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
  /** True when `process.versions.node` is a string (Node.js or Bun). */
  isNode: boolean;
  /** True when running inside a Web Worker or Cloudflare Worker (`WorkerGlobalScope` is present). */
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
 * Cloudflare Workers and other worker environments expose this.
 */
const hasWorkerGlobalScope = (): boolean => {
  try {
    return 'WorkerGlobalScope' in globalThis;
  } catch {
    return false;
  }
};

// Cloudflare Workers expose "Web Worker"-like environment (self, caches, fetch, etc.)
const isWorkerLike = !isNode && hasWorkerGlobalScope();
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
