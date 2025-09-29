/**
 * @fileoverview Unit tests for runtime capability detection.
 * @module tests/utils/internal/runtime.test
 */
import { describe, expect, it } from 'vitest';

import { runtimeCaps } from '../../../src/utils/internal/runtime.js';

describe('Runtime Capabilities', () => {
  it('should detect Node.js environment', () => {
    // This test runs in Node, so should be true
    expect(runtimeCaps.isNode).toBe(true);
    expect(runtimeCaps.hasProcess).toBe(true);
    expect(runtimeCaps.hasBuffer).toBe(true);
  });

  it('should correctly identify not being a worker or browser', () => {
    expect(runtimeCaps.isWorkerLike).toBe(false);
    expect(runtimeCaps.isBrowserLike).toBe(false);
  });

  it('should detect TextEncoder availability', () => {
    expect(runtimeCaps.hasTextEncoder).toBe(true);
  });

  it('should detect performance.now availability', () => {
    expect(runtimeCaps.hasPerformanceNow).toBe(true);
  });

  it('should export a valid RuntimeCapabilities object', () => {
    expect(runtimeCaps).toHaveProperty('isNode');
    expect(runtimeCaps).toHaveProperty('isWorkerLike');
    expect(runtimeCaps).toHaveProperty('isBrowserLike');
    expect(runtimeCaps).toHaveProperty('hasProcess');
    expect(runtimeCaps).toHaveProperty('hasBuffer');
    expect(runtimeCaps).toHaveProperty('hasTextEncoder');
    expect(runtimeCaps).toHaveProperty('hasPerformanceNow');
  });
});
