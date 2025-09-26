/**
 * @fileoverview Unit tests for the metrics registry helper.
 * @module tests/utils/metrics/registry.test
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { metrics } from '@opentelemetry/api';

import { config } from '../../../src/config/index.js';
import { metricsRegistry } from '../../../src/utils/metrics/registry.js';

describe('metricsRegistry', () => {
  let meter: {
    createCounter: ReturnType<typeof vi.fn>;
    createHistogram: ReturnType<typeof vi.fn>;
  };
  let counterInstance: {
    add: ReturnType<typeof vi.fn>;
    bind: ReturnType<typeof vi.fn>;
    unbind: ReturnType<typeof vi.fn>;
  };
  let histogramInstance: {
    record: ReturnType<typeof vi.fn>;
    bind: ReturnType<typeof vi.fn>;
    unbind: ReturnType<typeof vi.fn>;
  };
  let getMeterSpy: MockInstance;
  let originalEnabled: boolean;

  beforeEach(() => {
    counterInstance = {
      add: vi.fn(),
      bind: vi.fn(() => ({ add: vi.fn() })),
      unbind: vi.fn(),
    };
    histogramInstance = {
      record: vi.fn(),
      bind: vi.fn(() => ({ record: vi.fn() })),
      unbind: vi.fn(),
    };
    meter = {
      createCounter: vi.fn(() => counterInstance as never),
      createHistogram: vi.fn(() => histogramInstance as never),
    };
    originalEnabled = config.openTelemetry.enabled;
    config.openTelemetry.enabled = true;
    getMeterSpy = vi.spyOn(metrics, 'getMeter').mockReturnValue(meter as never);
  });

  afterEach(() => {
    config.openTelemetry.enabled = originalEnabled;
    getMeterSpy.mockRestore();
  });

  it('returns a no-op counter when telemetry is disabled', () => {
    config.openTelemetry.enabled = false;

    const counter = metricsRegistry.getCounter('disabled_counter');
    expect(counter.add(5)).toBeUndefined();
    expect(getMeterSpy).not.toHaveBeenCalled();
  });

  it('creates and caches counters when telemetry is enabled', () => {
    const first = metricsRegistry.getCounter('cached_counter');
    const second = metricsRegistry.getCounter('cached_counter');

    expect(first).toBe(second);
    expect(meter.createCounter).toHaveBeenCalledTimes(1);
    expect(getMeterSpy).toHaveBeenCalledTimes(1);
  });

  it('adds values using the underlying counter implementation', () => {
    metricsRegistry.add('add_counter', 3, { region: 'us' }, 'Requests', '1');

    expect(meter.createCounter).toHaveBeenCalledWith('add_counter', {
      description: 'Requests',
      unit: '1',
    });
    expect(counterInstance.add).toHaveBeenCalledWith(3, { region: 'us' });
  });

  it('records histogram values with attributes', () => {
    metricsRegistry.record(
      'histogram_metric',
      42,
      { status: 'ok' },
      'Latency',
      'ms',
    );

    expect(meter.createHistogram).toHaveBeenCalledWith('histogram_metric', {
      description: 'Latency',
      unit: 'ms',
    });
    expect(histogramInstance.record).toHaveBeenCalledWith(42, { status: 'ok' });
  });

  it('creates a counter with no options when description and unit are omitted', () => {
    metricsRegistry.getCounter('plain_counter');
    expect(meter.createCounter).toHaveBeenCalledWith('plain_counter');
  });

  it('creates a histogram with no options when description and unit are omitted', () => {
    metricsRegistry.getHistogram('plain_histogram');
    expect(meter.createHistogram).toHaveBeenCalledWith('plain_histogram');
  });

  it('caches counters and histograms by composite key (name|description|unit)', () => {
    // Make createCounter return distinct instances on first two calls
    const counter1 = {
      add: vi.fn(),
      bind: vi.fn(() => ({ add: vi.fn() })),
      unbind: vi.fn(),
    };
    const counter2 = {
      add: vi.fn(),
      bind: vi.fn(() => ({ add: vi.fn() })),
      unbind: vi.fn(),
    };
    (meter.createCounter as unknown as MockInstance)
      .mockImplementationOnce(() => counter1 as never)
      .mockImplementationOnce(() => counter2 as never);

    // Counters: two distinct keys and one duplicate
    const c1 = metricsRegistry.getCounter('multi', 'desc1', '1');
    const c2 = metricsRegistry.getCounter('multi', 'desc2', '1');
    const c3 = metricsRegistry.getCounter('multi', 'desc1', '1');

    expect(c1).toBe(counter1);
    expect(c2).toBe(counter2);
    expect(c1).toBe(c3);
    expect(meter.createCounter).toHaveBeenCalledTimes(2);

    // Make createHistogram return distinct instances on first two calls
    const hist1 = {
      record: vi.fn(),
      bind: vi.fn(() => ({ record: vi.fn() })),
      unbind: vi.fn(),
    };
    const hist2 = {
      record: vi.fn(),
      bind: vi.fn(() => ({ record: vi.fn() })),
      unbind: vi.fn(),
    };
    (meter.createHistogram as unknown as MockInstance)
      .mockImplementationOnce(() => hist1 as never)
      .mockImplementationOnce(() => hist2 as never);

    // Histograms: two distinct keys and one duplicate
    const h1 = metricsRegistry.getHistogram('multiH', 'd1', 'ms');
    const h2 = metricsRegistry.getHistogram('multiH', 'd2', 'ms');
    const h3 = metricsRegistry.getHistogram('multiH', 'd1', 'ms');

    expect(h1).toBe(hist1);
    expect(h2).toBe(hist2);
    expect(h1).toBe(h3);
    expect(meter.createHistogram).toHaveBeenCalledTimes(2);
  });

  it('enabled() reflects telemetry configuration', () => {
    config.openTelemetry.enabled = true;
    expect(metricsRegistry.enabled()).toBe(true);
    config.openTelemetry.enabled = false;
    expect(metricsRegistry.enabled()).toBe(false);
  });

  it('returns a no-op histogram when telemetry is disabled', () => {
    config.openTelemetry.enabled = false;
    const hist = metricsRegistry.getHistogram('disabled_hist');
    expect(() => hist.record(1)).not.toThrow();
    expect(getMeterSpy).not.toHaveBeenCalled();
  });
});
