/**
 * @fileoverview OpenTelemetry SDK initialization and lifecycle management.
 * This file MUST be imported before any other module in the application's
 * entry point (`src/index.ts`) to ensure all modules are correctly instrumented.
 * It handles both the initialization (startup) and graceful shutdown of the SDK.
 * @module src/utils/telemetry/instrumentation
 */
import { config } from '@/config/index.js';
import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  BatchSpanProcessor,
  type SpanProcessor,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions/incubating';

export let sdk: NodeSDK | null = null;

// A flag to ensure we only try to initialize once.
let isOtelInitialized = false;

if (config.openTelemetry.enabled && !isOtelInitialized) {
  isOtelInitialized = true;

  try {
    const otelLogLevelString =
      config.openTelemetry.logLevel.toUpperCase() as keyof typeof DiagLogLevel;
    const otelLogLevel = DiagLogLevel[otelLogLevelString] ?? DiagLogLevel.INFO;
    diag.setLogger(new DiagConsoleLogger(), otelLogLevel);

    const tracesEndpoint = config.openTelemetry.tracesEndpoint;
    const metricsEndpoint = config.openTelemetry.metricsEndpoint;

    if (!tracesEndpoint && !metricsEndpoint) {
      diag.warn(
        'OTEL_ENABLED is true, but no OTLP endpoint for traces or metrics is configured. OpenTelemetry will not export any telemetry.',
      );
    }

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.openTelemetry.serviceName,
      [ATTR_SERVICE_VERSION]: config.openTelemetry.serviceVersion,
      'deployment.environment.name': config.environment,
    });

    const spanProcessors: SpanProcessor[] = [];
    if (tracesEndpoint) {
      diag.info(`Using OTLP exporter for traces, endpoint: ${tracesEndpoint}`);
      const traceExporter = new OTLPTraceExporter({ url: tracesEndpoint });
      spanProcessors.push(new BatchSpanProcessor(traceExporter));
    } else {
      diag.info(
        'No OTLP traces endpoint configured. Traces will not be exported.',
      );
    }

    const metricReader = metricsEndpoint
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({ url: metricsEndpoint }),
          exportIntervalMillis: 15000,
        })
      : undefined;

    sdk = new NodeSDK({
      resource,
      spanProcessors,
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
        new PinoInstrumentation({
          logHook: (_span, record) => {
            record['trace_id'] = _span.spanContext().traceId;
            record['span_id'] = _span.spanContext().spanId;
          },
        }),
      ],
    });

    sdk.start();
    diag.info(
      `OpenTelemetry initialized for ${config.openTelemetry.serviceName} v${config.openTelemetry.serviceVersion}`,
    );
  } catch (error) {
    diag.error('Error initializing OpenTelemetry', error);
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
