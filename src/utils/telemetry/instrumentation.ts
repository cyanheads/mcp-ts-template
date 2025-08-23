/**
 * @fileoverview OpenTelemetry SDK initialization and lifecycle management.
 * This file MUST be imported before any other module in the application's
 * entry point (`src/index.ts`) to ensure all modules are correctly instrumented.
 * It handles both the initialization (startup) and graceful shutdown of the SDK.
 * @module src/utils/telemetry/instrumentation
 */
import { config } from "@/config/index.js";
import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  BatchSpanProcessor,
  ReadableSpan,
  SpanProcessor,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions/incubating";

export let sdk: NodeSDK | null = null;

if (config.openTelemetry.enabled) {
  // --- Custom Diagnostic Logger for OpenTelemetry ---
  // This logger uses the standard console to avoid circular dependencies with the main application logger.
  class OtelDiagnosticLogger extends DiagConsoleLogger {}

  /**
   * A custom SpanProcessor that writes ended spans to a log file using Pino.
   */
  class FileSpanProcessor implements SpanProcessor {
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
      // Dynamically import the logger in a non-blocking way to prevent circular dependencies.
      import("@/utils/internal/logger.js")
        .then(({ logger }) => {
          logger.info({ span: loggableSpan }, "Trace Span End");
        })
        .catch((err) => {
          diag.error("Failed to dynamically import logger for OTel span.", err);
        });
    }
    shutdown(): Promise<void> {
      return Promise.resolve();
    }
  }

  try {
    const otelLogLevel =
      DiagLogLevel[
        config.openTelemetry.logLevel as keyof typeof DiagLogLevel
      ] ?? DiagLogLevel.INFO;
    diag.setLogger(new OtelDiagnosticLogger(), otelLogLevel);

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.openTelemetry.serviceName,
      [ATTR_SERVICE_VERSION]: config.openTelemetry.serviceVersion,
      "deployment.environment.name": config.environment,
    });

    let spanProcessor: SpanProcessor;
    if (config.openTelemetry.tracesEndpoint) {
      diag.info(
        `Using OTLP exporter for traces, endpoint: ${config.openTelemetry.tracesEndpoint}`,
      );
      const traceExporter = new OTLPTraceExporter({
        url: config.openTelemetry.tracesEndpoint,
      });
      spanProcessor = new BatchSpanProcessor(traceExporter);
    } else {
      diag.info(
        "No OTLP endpoint configured. Using FileSpanProcessor for local trace logging.",
      );
      spanProcessor = new FileSpanProcessor();
    }

    const metricReader = config.openTelemetry.metricsEndpoint
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: config.openTelemetry.metricsEndpoint,
          }),
          exportIntervalMillis: 15000,
        })
      : undefined;

    sdk = new NodeSDK({
      resource,
      spanProcessors: [spanProcessor],
      metricReader,
      sampler: new TraceIdRatioBasedSampler(config.openTelemetry.samplingRatio),
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-http": {
            enabled: true,
            ignoreIncomingRequestHook: (req) => req.url === "/healthz",
          },
          "@opentelemetry/instrumentation-fs": { enabled: false },
        }),
      ],
    });

    sdk.start();
    diag.info(
      `OpenTelemetry initialized for ${config.openTelemetry.serviceName} v${config.openTelemetry.serviceVersion}`,
    );
  } catch (error) {
    diag.error("Error initializing OpenTelemetry", error);
    process.exit(1);
  }
}

/**
 * Gracefully shuts down the OpenTelemetry SDK.
 * This function is called during the application's shutdown sequence.
 */
export async function shutdownOpenTelemetry() {
  if (sdk) {
    await sdk
      .shutdown()
      .then(() => diag.info("OpenTelemetry terminated"))
      .catch((error) => diag.error("Error terminating OpenTelemetry", error));
  }
}
