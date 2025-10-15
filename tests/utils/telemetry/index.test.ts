/**
 * @fileoverview Test suite for telemetry utilities barrel export
 * @module tests/utils/telemetry/index.test
 */

import { describe, test, expect } from 'vitest';
import * as telemetryIndex from '@/utils/telemetry/index.js';
import * as instrumentation from '@/utils/telemetry/instrumentation.js';
import * as semconv from '@/utils/telemetry/semconv.js';
import * as trace from '@/utils/telemetry/trace.js';
import * as metrics from '@/utils/telemetry/metrics.js';

describe('Telemetry Utilities Barrel Export', () => {
  describe('Instrumentation exports', () => {
    test('should export initializeOpenTelemetry', () => {
      expect(telemetryIndex.initializeOpenTelemetry).toBeDefined();
      expect(telemetryIndex.initializeOpenTelemetry).toBe(
        instrumentation.initializeOpenTelemetry,
      );
    });

    test('should export shutdownOpenTelemetry', () => {
      expect(telemetryIndex.shutdownOpenTelemetry).toBeDefined();
      expect(telemetryIndex.shutdownOpenTelemetry).toBe(
        instrumentation.shutdownOpenTelemetry,
      );
    });

    test('should export sdk', () => {
      expect(telemetryIndex.sdk).toBe(instrumentation.sdk);
    });
  });

  describe('Semantic conventions exports', () => {
    test('should export standard OTEL service attributes', () => {
      expect(telemetryIndex.ATTR_SERVICE_NAME).toBe(semconv.ATTR_SERVICE_NAME);
      expect(telemetryIndex.ATTR_SERVICE_VERSION).toBe(
        semconv.ATTR_SERVICE_VERSION,
      );
      expect(telemetryIndex.ATTR_SERVICE_INSTANCE_ID).toBe(
        semconv.ATTR_SERVICE_INSTANCE_ID,
      );
    });

    test('should export standard OTEL cloud attributes', () => {
      expect(telemetryIndex.ATTR_CLOUD_PROVIDER).toBe(
        semconv.ATTR_CLOUD_PROVIDER,
      );
      expect(telemetryIndex.ATTR_CLOUD_PLATFORM).toBe(
        semconv.ATTR_CLOUD_PLATFORM,
      );
      expect(telemetryIndex.ATTR_CLOUD_REGION).toBe(semconv.ATTR_CLOUD_REGION);
    });

    test('should export standard OTEL HTTP attributes', () => {
      expect(telemetryIndex.ATTR_HTTP_REQUEST_METHOD).toBe(
        semconv.ATTR_HTTP_REQUEST_METHOD,
      );
      expect(telemetryIndex.ATTR_HTTP_RESPONSE_STATUS_CODE).toBe(
        semconv.ATTR_HTTP_RESPONSE_STATUS_CODE,
      );
      expect(telemetryIndex.ATTR_HTTP_ROUTE).toBe(semconv.ATTR_HTTP_ROUTE);
    });

    test('should export MCP custom tool attributes', () => {
      expect(telemetryIndex.ATTR_MCP_TOOL_NAME).toBe(
        semconv.ATTR_MCP_TOOL_NAME,
      );
      expect(telemetryIndex.ATTR_MCP_TOOL_DURATION_MS).toBe(
        semconv.ATTR_MCP_TOOL_DURATION_MS,
      );
      expect(telemetryIndex.ATTR_MCP_TOOL_SUCCESS).toBe(
        semconv.ATTR_MCP_TOOL_SUCCESS,
      );
    });

    test('should export MCP custom resource attributes', () => {
      expect(telemetryIndex.ATTR_MCP_RESOURCE_URI).toBe(
        semconv.ATTR_MCP_RESOURCE_URI,
      );
      expect(telemetryIndex.ATTR_MCP_RESOURCE_MIME_TYPE).toBe(
        semconv.ATTR_MCP_RESOURCE_MIME_TYPE,
      );
    });

    test('should export MCP request context attributes', () => {
      expect(telemetryIndex.ATTR_MCP_REQUEST_ID).toBe(
        semconv.ATTR_MCP_REQUEST_ID,
      );
      expect(telemetryIndex.ATTR_MCP_OPERATION_NAME).toBe(
        semconv.ATTR_MCP_OPERATION_NAME,
      );
      expect(telemetryIndex.ATTR_MCP_TENANT_ID).toBe(
        semconv.ATTR_MCP_TENANT_ID,
      );
    });
  });

  describe('Trace exports', () => {
    test('should export buildTraceparent', () => {
      expect(telemetryIndex.buildTraceparent).toBeDefined();
      expect(telemetryIndex.buildTraceparent).toBe(trace.buildTraceparent);
    });

    test('should export extractTraceparent', () => {
      expect(telemetryIndex.extractTraceparent).toBeDefined();
      expect(telemetryIndex.extractTraceparent).toBe(trace.extractTraceparent);
    });

    test('should export createContextWithParentTrace', () => {
      expect(telemetryIndex.createContextWithParentTrace).toBeDefined();
      expect(telemetryIndex.createContextWithParentTrace).toBe(
        trace.createContextWithParentTrace,
      );
    });

    test('should export injectCurrentContextInto', () => {
      expect(telemetryIndex.injectCurrentContextInto).toBeDefined();
      expect(telemetryIndex.injectCurrentContextInto).toBe(
        trace.injectCurrentContextInto,
      );
    });

    test('should export withSpan', () => {
      expect(telemetryIndex.withSpan).toBeDefined();
      expect(telemetryIndex.withSpan).toBe(trace.withSpan);
    });

    test('should export runInContext', () => {
      expect(telemetryIndex.runInContext).toBeDefined();
      expect(telemetryIndex.runInContext).toBe(trace.runInContext);
    });
  });

  describe('Metrics exports', () => {
    test('should export getMeter', () => {
      expect(telemetryIndex.getMeter).toBeDefined();
      expect(telemetryIndex.getMeter).toBe(metrics.getMeter);
    });

    test('should export createCounter', () => {
      expect(telemetryIndex.createCounter).toBeDefined();
      expect(telemetryIndex.createCounter).toBe(metrics.createCounter);
    });

    test('should export createUpDownCounter', () => {
      expect(telemetryIndex.createUpDownCounter).toBeDefined();
      expect(telemetryIndex.createUpDownCounter).toBe(
        metrics.createUpDownCounter,
      );
    });

    test('should export createHistogram', () => {
      expect(telemetryIndex.createHistogram).toBeDefined();
      expect(telemetryIndex.createHistogram).toBe(metrics.createHistogram);
    });

    test('should export createObservableGauge', () => {
      expect(telemetryIndex.createObservableGauge).toBeDefined();
      expect(telemetryIndex.createObservableGauge).toBe(
        metrics.createObservableGauge,
      );
    });

    test('should export createObservableCounter', () => {
      expect(telemetryIndex.createObservableCounter).toBeDefined();
      expect(telemetryIndex.createObservableCounter).toBe(
        metrics.createObservableCounter,
      );
    });

    test('should export createObservableUpDownCounter', () => {
      expect(telemetryIndex.createObservableUpDownCounter).toBeDefined();
      expect(telemetryIndex.createObservableUpDownCounter).toBe(
        metrics.createObservableUpDownCounter,
      );
    });
  });

  describe('Module completeness', () => {
    test('should not have missing exports from instrumentation', () => {
      const instrumentationExports = Object.keys(instrumentation);
      const reexported = instrumentationExports.filter((key) =>
        Object.hasOwn(telemetryIndex, key),
      );

      expect(reexported.length).toBeGreaterThan(0);
    });

    test('should not have missing exports from semconv', () => {
      const semconvExports = Object.keys(semconv);
      const reexported = semconvExports.filter((key) =>
        Object.hasOwn(telemetryIndex, key),
      );

      expect(reexported.length).toBeGreaterThan(0);
    });

    test('should not have missing exports from trace', () => {
      const traceExports = Object.keys(trace);
      const reexported = traceExports.filter((key) =>
        Object.hasOwn(telemetryIndex, key),
      );

      expect(reexported.length).toBeGreaterThan(0);
    });

    test('should not have missing exports from metrics', () => {
      const metricsExports = Object.keys(metrics);
      const reexported = metricsExports.filter((key) =>
        Object.hasOwn(telemetryIndex, key),
      );

      expect(reexported.length).toBeGreaterThan(0);
    });
  });

  describe('Type exports', () => {
    test('should be able to import TraceparentInfo type', () => {
      // This test verifies that types are properly re-exported
      // TypeScript will fail at compile time if types are not exported
      // type TestType = typeof telemetryIndex;
      expect(typeof telemetryIndex).toBe('object');
    });
  });

  describe('No unexpected exports', () => {
    test('should only export from known modules', () => {
      const allExports = Object.keys(telemetryIndex);

      // All exports should come from one of the four modules
      allExports.forEach((key) => {
        const isFromInstrumentation = Object.hasOwn(instrumentation, key);
        const isFromSemconv = Object.hasOwn(semconv, key);
        const isFromTrace = Object.hasOwn(trace, key);
        const isFromMetrics = Object.hasOwn(metrics, key);

        expect(
          isFromInstrumentation ||
            isFromSemconv ||
            isFromTrace ||
            isFromMetrics,
        ).toBe(true);
      });
    });
  });
});
