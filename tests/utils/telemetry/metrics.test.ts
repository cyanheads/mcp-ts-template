/**
 * @fileoverview Test suite for OpenTelemetry metrics
 * @module tests/utils/telemetry/metrics.test
 */

import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { metrics } from '@opentelemetry/api';
import * as metricsUtils from '@/utils/telemetry/metrics.js';
import { config } from '@/config/index.js';

describe('OpenTelemetry Metrics', () => {
  describe('getMeter', () => {
    test('should return a meter with default service name and version', () => {
      const meter = metricsUtils.getMeter();
      expect(meter).toBeDefined();
      // Meter is returned from OpenTelemetry API
    });

    test('should return a meter with custom name', () => {
      const customName = 'custom-meter';
      const meter = metricsUtils.getMeter(customName);
      expect(meter).toBeDefined();
    });

    test('should use config values for default meter', () => {
      const getMeterSpy = vi.spyOn(metrics, 'getMeter');
      metricsUtils.getMeter();

      expect(getMeterSpy).toHaveBeenCalledWith(
        config.openTelemetry.serviceName,
        config.openTelemetry.serviceVersion,
      );

      getMeterSpy.mockRestore();
    });

    test('should use custom name with config version', () => {
      const getMeterSpy = vi.spyOn(metrics, 'getMeter');
      const customName = 'test-meter';
      metricsUtils.getMeter(customName);

      expect(getMeterSpy).toHaveBeenCalledWith(
        customName,
        config.openTelemetry.serviceVersion,
      );

      getMeterSpy.mockRestore();
    });
  });

  describe('createCounter', () => {
    let createCounterSpy: ReturnType<typeof vi.spyOn>;
    let mockMeter: any;

    beforeEach(() => {
      mockMeter = {
        createCounter: vi.fn().mockReturnValue({ add: vi.fn() }),
      };
      vi.spyOn(metrics, 'getMeter').mockReturnValue(mockMeter);
      createCounterSpy = mockMeter.createCounter;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('should create counter with name and description', () => {
      const counter = metricsUtils.createCounter(
        'test.counter',
        'Test counter',
      );

      expect(createCounterSpy).toHaveBeenCalledWith('test.counter', {
        description: 'Test counter',
        unit: '1',
      });
      expect(counter).toBeDefined();
    });

    test('should create counter with custom unit', () => {
      metricsUtils.createCounter('test.bytes', 'Bytes counter', 'bytes');

      expect(createCounterSpy).toHaveBeenCalledWith('test.bytes', {
        description: 'Bytes counter',
        unit: 'bytes',
      });
    });

    test('should default to unit "1"', () => {
      metricsUtils.createCounter('test.requests', 'Request counter');

      expect(createCounterSpy).toHaveBeenCalledWith('test.requests', {
        description: 'Request counter',
        unit: '1',
      });
    });

    test('should return counter with add method', () => {
      const counter = metricsUtils.createCounter('test.counter', 'Test');
      expect(counter).toHaveProperty('add');
      expect(typeof counter.add).toBe('function');
    });
  });

  describe('createUpDownCounter', () => {
    let createUpDownCounterSpy: ReturnType<typeof vi.spyOn>;
    let mockMeter: any;

    beforeEach(() => {
      mockMeter = {
        createUpDownCounter: vi.fn().mockReturnValue({ add: vi.fn() }),
      };
      vi.spyOn(metrics, 'getMeter').mockReturnValue(mockMeter);
      createUpDownCounterSpy = mockMeter.createUpDownCounter;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('should create up-down counter with name and description', () => {
      const counter = metricsUtils.createUpDownCounter(
        'test.updown',
        'Up-down counter',
      );

      expect(createUpDownCounterSpy).toHaveBeenCalledWith('test.updown', {
        description: 'Up-down counter',
        unit: '1',
      });
      expect(counter).toBeDefined();
    });

    test('should create up-down counter with custom unit', () => {
      metricsUtils.createUpDownCounter(
        'test.connections',
        'Active connections',
        '{connections}',
      );

      expect(createUpDownCounterSpy).toHaveBeenCalledWith('test.connections', {
        description: 'Active connections',
        unit: '{connections}',
      });
    });

    test('should return counter with add method', () => {
      const counter = metricsUtils.createUpDownCounter('test.gauge', 'Test');
      expect(counter).toHaveProperty('add');
      expect(typeof counter.add).toBe('function');
    });
  });

  describe('createHistogram', () => {
    let createHistogramSpy: ReturnType<typeof vi.spyOn>;
    let mockMeter: any;

    beforeEach(() => {
      mockMeter = {
        createHistogram: vi.fn().mockReturnValue({ record: vi.fn() }),
      };
      vi.spyOn(metrics, 'getMeter').mockReturnValue(mockMeter);
      createHistogramSpy = mockMeter.createHistogram;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('should create histogram with name and description', () => {
      const histogram = metricsUtils.createHistogram(
        'test.duration',
        'Duration histogram',
      );

      expect(createHistogramSpy).toHaveBeenCalledWith('test.duration', {
        description: 'Duration histogram',
      });
      expect(histogram).toBeDefined();
    });

    test('should create histogram with unit', () => {
      metricsUtils.createHistogram('test.latency', 'Latency histogram', 'ms');

      expect(createHistogramSpy).toHaveBeenCalledWith('test.latency', {
        description: 'Latency histogram',
        unit: 'ms',
      });
    });

    test('should not include unit in options if not provided', () => {
      metricsUtils.createHistogram('test.size', 'Size histogram');

      expect(createHistogramSpy).toHaveBeenCalledWith('test.size', {
        description: 'Size histogram',
      });
    });

    test('should return histogram with record method', () => {
      const histogram = metricsUtils.createHistogram('test.hist', 'Test');
      expect(histogram).toHaveProperty('record');
      expect(typeof histogram.record).toBe('function');
    });
  });

  describe('createObservableGauge', () => {
    let createObservableGaugeSpy: ReturnType<typeof vi.spyOn>;
    let mockMeter: any;

    beforeEach(() => {
      mockMeter = {
        createObservableGauge: vi.fn().mockReturnValue({}),
      };
      vi.spyOn(metrics, 'getMeter').mockReturnValue(mockMeter);
      createObservableGaugeSpy = mockMeter.createObservableGauge;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('should create observable gauge with name and description', () => {
      const callback = () => 42;
      const gauge = metricsUtils.createObservableGauge(
        'test.memory',
        'Memory gauge',
        callback,
      );

      expect(createObservableGaugeSpy).toHaveBeenCalledWith('test.memory', {
        description: 'Memory gauge',
      });
      expect(gauge).toBeDefined();
    });

    test('should create observable gauge with unit', () => {
      const callback = () => Promise.resolve(100);
      metricsUtils.createObservableGauge(
        'test.temp',
        'Temperature',
        callback,
        'celsius',
      );

      expect(createObservableGaugeSpy).toHaveBeenCalledWith('test.temp', {
        description: 'Temperature',
        unit: 'celsius',
      });
    });

    test('should accept async callback', () => {
      const asyncCallback = async () => 123;
      const gauge = metricsUtils.createObservableGauge(
        'test.async',
        'Async gauge',
        asyncCallback,
      );

      expect(gauge).toBeDefined();
    });

    test('should accept sync callback', () => {
      const syncCallback = () => 456;
      const gauge = metricsUtils.createObservableGauge(
        'test.sync',
        'Sync gauge',
        syncCallback,
      );

      expect(gauge).toBeDefined();
    });
  });

  describe('createObservableCounter', () => {
    let createObservableCounterSpy: ReturnType<typeof vi.spyOn>;
    let mockMeter: any;

    beforeEach(() => {
      mockMeter = {
        createObservableCounter: vi.fn().mockReturnValue({}),
      };
      vi.spyOn(metrics, 'getMeter').mockReturnValue(mockMeter);
      createObservableCounterSpy = mockMeter.createObservableCounter;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('should create observable counter with name and description', () => {
      const callback = () => 10;
      const counter = metricsUtils.createObservableCounter(
        'test.total',
        'Total counter',
        callback,
      );

      expect(createObservableCounterSpy).toHaveBeenCalledWith('test.total', {
        description: 'Total counter',
        unit: '1',
      });
      expect(counter).toBeDefined();
    });

    test('should create observable counter with custom unit', () => {
      const callback = () => Promise.resolve(50);
      metricsUtils.createObservableCounter(
        'test.jobs',
        'Jobs processed',
        callback,
        '{jobs}',
      );

      expect(createObservableCounterSpy).toHaveBeenCalledWith('test.jobs', {
        description: 'Jobs processed',
        unit: '{jobs}',
      });
    });

    test('should default to unit "1"', () => {
      const callback = () => 0;
      metricsUtils.createObservableCounter(
        'test.events',
        'Event counter',
        callback,
      );

      expect(createObservableCounterSpy).toHaveBeenCalledWith('test.events', {
        description: 'Event counter',
        unit: '1',
      });
    });
  });

  describe('createObservableUpDownCounter', () => {
    let createObservableUpDownCounterSpy: ReturnType<typeof vi.spyOn>;
    let mockMeter: any;

    beforeEach(() => {
      mockMeter = {
        createObservableUpDownCounter: vi.fn().mockReturnValue({}),
      };
      vi.spyOn(metrics, 'getMeter').mockReturnValue(mockMeter);
      createObservableUpDownCounterSpy =
        mockMeter.createObservableUpDownCounter;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('should create observable up-down counter with name and description', () => {
      const callback = () => 5;
      const counter = metricsUtils.createObservableUpDownCounter(
        'test.queue',
        'Queue size',
        callback,
      );

      expect(createObservableUpDownCounterSpy).toHaveBeenCalledWith(
        'test.queue',
        {
          description: 'Queue size',
          unit: '1',
        },
      );
      expect(counter).toBeDefined();
    });

    test('should create observable up-down counter with custom unit', () => {
      const callback = async () => -3;
      metricsUtils.createObservableUpDownCounter(
        'test.items',
        'Item count',
        callback,
        '{items}',
      );

      expect(createObservableUpDownCounterSpy).toHaveBeenCalledWith(
        'test.items',
        {
          description: 'Item count',
          unit: '{items}',
        },
      );
    });

    test('should default to unit "1"', () => {
      const callback = () => 0;
      metricsUtils.createObservableUpDownCounter(
        'test.delta',
        'Delta counter',
        callback,
      );

      expect(createObservableUpDownCounterSpy).toHaveBeenCalledWith(
        'test.delta',
        {
          description: 'Delta counter',
          unit: '1',
        },
      );
    });
  });

  describe('Integration', () => {
    let mockMeter: any;

    beforeEach(() => {
      mockMeter = {
        createCounter: vi.fn().mockReturnValue({ add: vi.fn() }),
        createHistogram: vi.fn().mockReturnValue({ record: vi.fn() }),
        createUpDownCounter: vi.fn().mockReturnValue({ add: vi.fn() }),
        createObservableGauge: vi.fn().mockReturnValue({}),
        createObservableCounter: vi.fn().mockReturnValue({}),
        createObservableUpDownCounter: vi.fn().mockReturnValue({}),
      };
      vi.spyOn(metrics, 'getMeter').mockReturnValue(mockMeter);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('should create multiple different metric types', () => {
      const counter = metricsUtils.createCounter('app.requests', 'Requests');
      const histogram = metricsUtils.createHistogram(
        'app.duration',
        'Duration',
        'ms',
      );
      const upDownCounter = metricsUtils.createUpDownCounter(
        'app.connections',
        'Connections',
      );

      expect(counter).toBeDefined();
      expect(histogram).toBeDefined();
      expect(upDownCounter).toBeDefined();
    });

    test('should handle metric naming conventions', () => {
      const metricNames = [
        'service.requests.total',
        'http.server.duration',
        'db.connections.active',
        'mcp.tool.executions',
      ];

      metricNames.forEach((name) => {
        const counter = metricsUtils.createCounter(name, `Counter for ${name}`);
        expect(counter).toBeDefined();
      });
    });
  });
});
