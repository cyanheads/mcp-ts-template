/**
 * @fileoverview Test suite for telemetry utilities barrel export
 * @module tests/utils/telemetry/index.test
 */

import { describe, expect, test } from 'vitest';
import * as attributes from '@/utils/telemetry/attributes.js';
import * as telemetryIndex from '@/utils/telemetry/index.js';
import * as instrumentation from '@/utils/telemetry/instrumentation.js';
import * as metrics from '@/utils/telemetry/metrics.js';
import * as trace from '@/utils/telemetry/trace.js';

describe('Telemetry Utilities Barrel Export', () => {
  describe('Instrumentation exports', () => {
    test('should export initializeOpenTelemetry', () => {
      expect(telemetryIndex.initializeOpenTelemetry).toBeDefined();
      expect(telemetryIndex.initializeOpenTelemetry).toBe(instrumentation.initializeOpenTelemetry);
    });

    test('should export shutdownOpenTelemetry', () => {
      expect(telemetryIndex.shutdownOpenTelemetry).toBeDefined();
      expect(telemetryIndex.shutdownOpenTelemetry).toBe(instrumentation.shutdownOpenTelemetry);
    });

    test('should export sdk', () => {
      expect(telemetryIndex.sdk).toBe(instrumentation.sdk);
    });
  });

  describe('Attribute exports', () => {
    test('should export MCP custom tool attributes', () => {
      expect(telemetryIndex.ATTR_MCP_TOOL_NAME).toBe(attributes.ATTR_MCP_TOOL_NAME);
      expect(telemetryIndex.ATTR_MCP_TOOL_DURATION_MS).toBe(attributes.ATTR_MCP_TOOL_DURATION_MS);
      expect(telemetryIndex.ATTR_MCP_TOOL_SUCCESS).toBe(attributes.ATTR_MCP_TOOL_SUCCESS);
    });

    test('should export MCP custom resource attributes', () => {
      expect(telemetryIndex.ATTR_MCP_RESOURCE_URI).toBe(attributes.ATTR_MCP_RESOURCE_URI);
      expect(telemetryIndex.ATTR_MCP_RESOURCE_MIME_TYPE).toBe(
        attributes.ATTR_MCP_RESOURCE_MIME_TYPE,
      );
    });

    test('should export MCP request context attributes', () => {
      expect(telemetryIndex.ATTR_MCP_TENANT_ID).toBe(attributes.ATTR_MCP_TENANT_ID);
      expect(telemetryIndex.ATTR_MCP_CLIENT_ID).toBe(attributes.ATTR_MCP_CLIENT_ID);
    });

    test('should export GenAI attributes', () => {
      expect(telemetryIndex.ATTR_GEN_AI_SYSTEM).toBe(attributes.ATTR_GEN_AI_SYSTEM);
      expect(telemetryIndex.ATTR_GEN_AI_REQUEST_MODEL).toBe(attributes.ATTR_GEN_AI_REQUEST_MODEL);
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
      expect(telemetryIndex.createContextWithParentTrace).toBe(trace.createContextWithParentTrace);
    });

    test('should export injectCurrentContextInto', () => {
      expect(telemetryIndex.injectCurrentContextInto).toBeDefined();
      expect(telemetryIndex.injectCurrentContextInto).toBe(trace.injectCurrentContextInto);
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
      expect(telemetryIndex.createUpDownCounter).toBe(metrics.createUpDownCounter);
    });

    test('should export createHistogram', () => {
      expect(telemetryIndex.createHistogram).toBeDefined();
      expect(telemetryIndex.createHistogram).toBe(metrics.createHistogram);
    });
  });

  describe('Module completeness', () => {
    test('should not have missing exports from instrumentation', () => {
      const instrumentationExports = Object.keys(instrumentation);
      const reexported = instrumentationExports.filter((key) => Object.hasOwn(telemetryIndex, key));
      expect(reexported.length).toBeGreaterThan(0);
    });

    test('should not have missing exports from attributes', () => {
      const attributeExports = Object.keys(attributes);
      const reexported = attributeExports.filter((key) => Object.hasOwn(telemetryIndex, key));
      expect(reexported.length).toBeGreaterThan(0);
    });

    test('should not have missing exports from trace', () => {
      const traceExports = Object.keys(trace);
      const reexported = traceExports.filter((key) => Object.hasOwn(telemetryIndex, key));
      expect(reexported.length).toBeGreaterThan(0);
    });

    test('should not have missing exports from metrics', () => {
      const metricsExports = Object.keys(metrics);
      const reexported = metricsExports.filter((key) => Object.hasOwn(telemetryIndex, key));
      expect(reexported.length).toBeGreaterThan(0);
    });
  });

  describe('No unexpected exports', () => {
    test('should only export from known modules', () => {
      const allExports = Object.keys(telemetryIndex);

      allExports.forEach((key) => {
        const isFromInstrumentation = Object.hasOwn(instrumentation, key);
        const isFromAttributes = Object.hasOwn(attributes, key);
        const isFromTrace = Object.hasOwn(trace, key);
        const isFromMetrics = Object.hasOwn(metrics, key);

        expect(isFromInstrumentation || isFromAttributes || isFromTrace || isFromMetrics).toBe(
          true,
        );
      });
    });
  });
});
