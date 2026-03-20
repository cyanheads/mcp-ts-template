/**
 * @fileoverview Focused tests for initHighResTimer variants.
 * @module tests/utils/internal/performance.init.test
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

type PerfHooksPerformance = typeof import('perf_hooks').performance;

import { logger } from '../../../../src/utils/internal/logger.js';
import * as performanceModule from '../../../../src/utils/internal/performance.js';

type GlobalWithPerf = typeof globalThis & { performance?: Performance };

const g = globalThis as GlobalWithPerf;
const originalPerformance = g.performance;
const originalDateNow = Date.now;

afterEach(() => {
  if (originalPerformance) {
    g.performance = originalPerformance;
  } else {
    delete g.performance;
  }
  Date.now = originalDateNow;
  vi.restoreAllMocks();
});

describe('initHighResTimer', () => {
  it('uses browser performance.now when available', async () => {
    const nowSpy = vi.fn(() => 123.45);
    g.performance = { now: nowSpy } as unknown as Performance;

    await performanceModule.initHighResTimer();

    expect(performanceModule.nowMs()).toBe(123.45);
    expect(nowSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to Date.now when perf_hooks import fails', async () => {
    const warningSpy = vi.spyOn(logger, 'warning').mockImplementation(() => {});
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(678.9);

    delete g.performance;

    // Pass a failing loader directly — vi.spyOn on ESM exports doesn't
    // affect internal module calls.
    const failingLoader = async () => {
      throw new Error('perf_hooks unavailable');
    };
    await performanceModule.initHighResTimer(failingLoader);

    const result = performanceModule.nowMs();
    expect(typeof result).toBe('number');
    expect(warningSpy).toHaveBeenCalledWith(
      'Could not import perf_hooks, falling back to Date.now() for performance timing.',
    );
    expect(dateNowSpy).toHaveBeenCalled();
  });

  it('uses perf_hooks when available in a Node environment', async () => {
    const nowSpy = vi.fn(() => 456.78);

    delete g.performance;

    // Pass a mock loader that returns a fake perf_hooks performance object.
    const mockLoader = async () => ({
      performance: { now: nowSpy } as unknown as PerfHooksPerformance,
    });
    await performanceModule.initHighResTimer(mockLoader);

    const result = performanceModule.nowMs();
    expect(typeof result).toBe('number');
    expect(nowSpy).toHaveBeenCalled();
  });

  it('loadPerfHooks returns the perf_hooks performance interface', async () => {
    const mod = await performanceModule.loadPerfHooks();
    expect(typeof mod.performance.now).toBe('function');
  });
});
