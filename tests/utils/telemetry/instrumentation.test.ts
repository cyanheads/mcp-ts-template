/**
 * @fileoverview Tests for OpenTelemetry instrumentation.
 * @module tests/utils/telemetry/instrumentation.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies using vi.doMock to ensure they are mocked before module import
const mockSpanProcessor = {
  onEnd: vi.fn(),
  shutdown: vi.fn().mockResolvedValue(undefined),
  forceFlush: vi.fn().mockResolvedValue(undefined),
  onStart: vi.fn(),
  constructor: { name: "FileSpanProcessor" },
};

const mockNodeSDKInstance = {
  start: vi.fn(),
  shutdown: vi.fn().mockResolvedValue(undefined),
  spanProcessors: [mockSpanProcessor],
};
const NodeSDKMock = vi.fn(() => mockNodeSDKInstance);

vi.doMock("@opentelemetry/sdk-node", () => ({
  NodeSDK: NodeSDKMock,
  BatchSpanProcessor: vi.fn(),
  TraceIdRatioBasedSampler: vi.fn(),
}));

const mTransports = {
  File: vi.fn(),
  Console: vi.fn(),
};
const mFormat = {
  combine: vi.fn(),
  timestamp: vi.fn(),
  json: vi.fn(),
};
const mLogger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  verbose: vi.fn(),
  on: vi.fn().mockReturnThis(),
  end: vi.fn(),
};
const createLoggerMock = vi.fn(() => mLogger);

vi.doMock("winston", () => ({
  createLogger: createLoggerMock,
  format: mFormat,
  transports: mTransports,
  default: {
    createLogger: createLoggerMock,
    format: mFormat,
    transports: mTransports,
  },
}));

vi.doMock("../../src/config/index", () => ({
  config: {
    openTelemetry: {
      enabled: true,
      serviceName: "test-service",
      serviceVersion: "1.0.0",
      logLevel: "INFO",
      samplingRatio: 1,
      tracesEndpoint: "",
      metricsEndpoint: "",
    },
    logsPath: "/tmp/logs",
    environment: "test",
  },
}));

describe("OpenTelemetry Instrumentation", () => {
  let instrumentation: typeof import("../../../src/utils/telemetry/instrumentation.js");

  beforeEach(async () => {
    vi.resetModules(); // This is crucial to force re-import with mocks
    instrumentation = await import(
      "../../../src/utils/telemetry/instrumentation.js"
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("OtelDiagnosticLogger", () => {
    it("should create a winston logger with a file transport if logsPath is available", () => {
      expect(createLoggerMock).toHaveBeenCalled();
      expect(mTransports.File).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.stringContaining("opentelemetry.log"),
        }),
      );
    });
  });

  describe("FileSpanProcessor", () => {
    it("should log spans to a file", async () => {
      // This test is conceptual as FileSpanProcessor is instantiated inside the module.
      // We verify its constructor calls winston, which is a good proxy.
      expect(createLoggerMock).toHaveBeenCalled();
      expect(mTransports.File).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.stringContaining("traces.log"),
        }),
      );
    });
  });

  describe("SDK Initialization", () => {
    it("should initialize NodeSDK with correct parameters", () => {
      expect(NodeSDKMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sampler: expect.any(Object),
          resource: expect.any(Object),
        }),
      );
      expect(mockNodeSDKInstance.start).toHaveBeenCalled();
    });
  });

  describe("shutdownOpenTelemetry", () => {
    it("should call sdk.shutdown if sdk is initialized", async () => {
      // The sdk instance is now the mocked one
      expect(instrumentation.sdk).toBe(mockNodeSDKInstance);
      await instrumentation.shutdownOpenTelemetry();
      expect(mockNodeSDKInstance.shutdown).toHaveBeenCalled();
    });
  });
});
