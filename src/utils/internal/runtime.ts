/**
 * @fileoverview Runtime capability detection for multi-environment support.
 * Detects presence of Node features, Web/Workers APIs, and common globals.
 * @module src/utils/internal/runtime
 */

export interface RuntimeCapabilities {
  isNode: boolean;
  isWorkerLike: boolean;
  isBrowserLike: boolean;
  hasProcess: boolean;
  hasBuffer: boolean;
  hasTextEncoder: boolean;
  hasPerformanceNow: boolean;
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
    return (
      typeof globalThis.performance === 'object' &&
      globalThis.performance !== null &&
      typeof globalThis.performance.now === 'function'
    );
  } catch {
    return false;
  }
};

const isNode = hasNodeVersion();
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

export const runtimeCaps: RuntimeCapabilities = {
  isNode,
  isWorkerLike,
  isBrowserLike,
  hasProcess,
  hasBuffer,
  hasTextEncoder,
  hasPerformanceNow,
};
