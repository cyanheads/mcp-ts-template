/**
 * @fileoverview Focused tests for initializePerformance_Hrt variants.
 * @module tests/utils/internal/performance.init.test
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

type PerfHooksPerformance = typeof import('perf_hooks').performance;

import { logger } from '../../../src/utils/internal/logger.js';
import * as performanceModule from '../../../src/utils/internal/performance.js';

const originalPerformance = globalThis.performance;
const originalDateNow = Date.now;

afterEach(() => {
  if (originalPerformance) {
    globalThis.performance = originalPerformance;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as { performance?: typeof globalThis.performance })
      .performance;
  }
  Date.now = originalDateNow;
  vi.restoreAllMocks();
});

describe('initializePerformance_Hrt', () => {
  it('uses browser performance.now when available', async () => {
    const nowSpy = vi.fn(() => 123.45);
    globalThis.performance = {
      now: nowSpy,
    } as unknown as typeof globalThis.performance;

    await performanceModule.initializePerformance_Hrt();

    expect(performanceModule.nowMs()).toBe(123.45);
    expect(nowSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to Date.now when perf_hooks import fails', async () => {
    const warningSpy = vi.spyOn(logger, 'warning').mockImplementation(() => {});
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(678.9);
    vi.spyOn(performanceModule, 'loadPerfHooks').mockRejectedValue(
      new Error('perf_hooks unavailable'),
    );

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as { performance?: typeof globalThis.performance })
      .performance;

    await performanceModule.initializePerformance_Hrt();

    expect(performanceModule.nowMs()).toBe(678.9);
    expect(warningSpy).toHaveBeenCalledWith(
      'Could not import perf_hooks, falling back to Date.now() for performance timing.',
    );
    expect(dateNowSpy).toHaveBeenCalledTimes(1);
  });

  it('uses perf_hooks when available in a Node environment', async () => {
    const nowSpy = vi.fn(() => 456.78);
    vi.spyOn(performanceModule, 'loadPerfHooks').mockResolvedValue({
      performance: { now: nowSpy } as unknown as PerfHooksPerformance,
    });

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as { performance?: typeof globalThis.performance })
      .performance;

    await performanceModule.initializePerformance_Hrt();

    expect(performanceModule.nowMs()).toBe(456.78);
    expect(nowSpy).toHaveBeenCalledTimes(1);
  });

  it('loadPerfHooks returns the perf_hooks performance interface', async () => {
    const mod = await performanceModule.loadPerfHooks();
    expect(typeof mod.performance.now).toBe('function');
  });
});
