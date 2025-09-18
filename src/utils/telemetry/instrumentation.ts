/**
 * @fileoverview OpenTelemetry SDK initialization and lifecycle management.
 * This file MUST be imported before any other module in the application's
 * entry point (`src/index.ts`) to ensure all modules are correctly instrumented.
 * It handles both the initialization (startup) and graceful shutdown of the SDK.
 * @module src/utils/telemetry/instrumentation
 */
import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  BatchSpanProcessor,
  type ReadableSpan,
  type SpanProcessor,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions/incubating';
import path from 'path';
import winston from 'winston';

import { config } from '@/config/index.js';

export let sdk: NodeSDK | null = null;

// A flag to ensure we only try to initialize once.
let isOtelInitialized = false;

if (config.openTelemetry.enabled && !isOtelInitialized) {
  isOtelInitialized = true;

  // --- Custom Diagnostic Logger for OpenTelemetry ---
  class OtelDiagnosticLogger extends DiagConsoleLogger {
    private winstonLogger: winston.Logger;
    constructor(logLevel: DiagLogLevel) {
      super();
      const logsDir = config.logsPath;
      if (!logsDir) {
        if (process.stdout.isTTY) {
          console.error(
            'OpenTelemetry Diagnostics: Log directory not available. Diagnostics will be written to console only.',
          );
        }
        this.winstonLogger = winston.createLogger({
          level: DiagLogLevel[logLevel].toLowerCase(),
          transports: [new winston.transports.Console()],
        });
        return;
      }
      this.winstonLogger = winston.createLogger({
        level: DiagLogLevel[logLevel].toLowerCase(),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
        transports: [
          new winston.transports.File({
            filename: path.join(logsDir, 'opentelemetry.log'),
            maxsize: 5 * 1024 * 1024,
            maxFiles: 3,
          }),
        ],
      });
    }
    public override error = (message: string, ...args: unknown[]): void => {
      this.winstonLogger.error(message, { args });
    };
    public override warn = (message: string, ...args: unknown[]): void => {
      this.winstonLogger.warn(message, { args });
    };
    public override info = (message: string, ...args: unknown[]): void => {
      this.winstonLogger.info(message, { args });
    };
    public override debug = (message: string, ...args: unknown[]): void => {
      this.winstonLogger.debug(message, { args });
    };
    public override verbose = (message: string, ...args: unknown[]): void => {
      this.winstonLogger.verbose(message, { args });
    };
  }

  /**
   * A custom SpanProcessor that writes ended spans to a log file using Winston.
   * This is used as a fallback when no OTLP endpoint is configured.
   */
  class FileSpanProcessor implements SpanProcessor {
    private traceLogger: winston.Logger;

    constructor() {
      const logsDir = config.logsPath;
      if (!logsDir) {
        diag.error(
          '[FileSpanProcessor] Cannot initialize: logsPath is not available.',
        );
        this.traceLogger = winston.createLogger({ silent: true });
        return;
      }
      this.traceLogger = winston.createLogger({
        format: winston.format.json(),
        transports: [
          new winston.transports.File({
            filename: path.join(logsDir, 'traces.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
          }),
        ],
      });
    }

    forceFlush(): Promise<void> {
      return Promise.resolve();
    }
    onStart(_span: ReadableSpan): void {}
    onEnd(span: ReadableSpan): void {
      const loggableSpan = {
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        name: span.name,
        kind: span.kind,
        startTime: span.startTime,
        endTime: span.endTime,
        duration: span.duration,
        status: span.status,
        attributes: span.attributes,
        events: span.events,
      };
      this.traceLogger.info(loggableSpan);
    }
    shutdown(): Promise<void> {
      return new Promise((resolve) =>
        this.traceLogger.on('finish', resolve).end(),
      );
    }
  }

  try {
    const otelLogLevelString =
      config.openTelemetry.logLevel.toUpperCase() as keyof typeof DiagLogLevel;
    const otelLogLevel = DiagLogLevel[otelLogLevelString] ?? DiagLogLevel.INFO;
    diag.setLogger(new OtelDiagnosticLogger(otelLogLevel), otelLogLevel);

    const tracesEndpoint = config.openTelemetry.tracesEndpoint;
    const metricsEndpoint = config.openTelemetry.metricsEndpoint;

    if (!tracesEndpoint && !metricsEndpoint) {
      diag.warn(
        'OTEL_ENABLED is true, but no OTLP endpoint for traces or metrics is configured. OpenTelemetry will use local file logging for traces and will not export metrics. To enable OTLP export, set OTEL_EXPORTER_OTLP_TRACES_ENDPOINT and/or OTEL_EXPORTER_OTLP_METRICS_ENDPOINT.',
      );
    }

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.openTelemetry.serviceName,
      [ATTR_SERVICE_VERSION]: config.openTelemetry.serviceVersion,
      'deployment.environment.name': config.environment,
    });

    let spanProcessor: SpanProcessor;
    if (tracesEndpoint) {
      diag.info(`Using OTLP exporter for traces, endpoint: ${tracesEndpoint}`);
      const traceExporter = new OTLPTraceExporter({ url: tracesEndpoint });
      spanProcessor = new BatchSpanProcessor(traceExporter);
    } else {
      diag.info(
        'No OTLP traces endpoint configured. Using FileSpanProcessor for local trace logging only.',
      );
      spanProcessor = new FileSpanProcessor();
    }

    const metricReader = metricsEndpoint
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({ url: metricsEndpoint }),
          exportIntervalMillis: 15000,
        })
      : undefined;

    sdk = new NodeSDK({
      resource,
      spanProcessors: [spanProcessor],
      ...(metricReader && { metricReader }),
      sampler: new TraceIdRatioBasedSampler(config.openTelemetry.samplingRatio),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingRequestHook: (req) => req.url === '/healthz',
          },
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
        new WinstonInstrumentation({
          enabled: true,
        }),
      ],
    });

    sdk.start();
    diag.info(
      `OpenTelemetry initialized for ${config.openTelemetry.serviceName} v${config.openTelemetry.serviceVersion}`,
    );
  } catch (error) {
    diag.error('Error initializing OpenTelemetry', error);
    // Do not exit process here, allow the app to run without telemetry.
    sdk = null;
  }
}

/**
 * Gracefully shuts down the OpenTelemetry SDK.
 * This function is called during the application's shutdown sequence.
 */
export async function shutdownOpenTelemetry() {
  if (sdk) {
    try {
      await sdk.shutdown();
      diag.info('OpenTelemetry terminated successfully.');
    } catch (error) {
      diag.error('Error terminating OpenTelemetry', error);
    }
  }
}
