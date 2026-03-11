/**
 * @fileoverview Health snapshot utility to surface observability/runtime readiness.
 * This avoids heavy checks and focuses on quick signals for status endpoints or logs.
 * @module src/utils/internal/health
 */

import { config } from '@/config/index.js';
import { logger } from '@/utils/internal/logger.js';
import { runtimeCaps } from '@/utils/internal/runtime.js';

/**
 * A point-in-time snapshot of server health signals.
 * Intentionally lightweight — all fields are derived from already-initialized
 * singletons and involve no I/O, so this is safe to call at any time.
 */
export interface HealthSnapshot {
  /** Core application identity pulled from the active config. */
  app: {
    /** Server name (from `MCP_SERVER_NAME` or `package.json`). */
    name: string;
    /** Server version string (from `MCP_SERVER_VERSION` or `package.json`). */
    version: string;
    /** Deployment environment (e.g. `'development'`, `'production'`). */
    environment: string;
  };
  /** Logger initialization state. */
  logging: {
    /** True when the logger has been fully initialized and is ready to emit records. */
    initialized: boolean;
  };
  /** Runtime environment classification from {@link runtimeCaps}. */
  runtime: {
    /** True when running under Node.js or Bun. */
    isNode: boolean;
    /** True when running inside a Web Worker or Cloudflare Worker. */
    isWorkerLike: boolean;
    /** True when running in a browser main thread. */
    isBrowserLike: boolean;
  };
  /** OpenTelemetry configuration state. */
  telemetry: {
    /** True when OpenTelemetry export is enabled (`OTEL_ENABLED=true`). */
    enabled: boolean;
    /** The OTel diagnostic log level, or `undefined` if not configured. */
    diagLevel: string | undefined;
  };
}

/**
 * Returns a lightweight, synchronous health snapshot of the running server.
 *
 * Aggregates app identity, runtime environment flags, logger state, and
 * OpenTelemetry configuration into a single object. Suitable for `/healthz`
 * endpoints, startup log lines, or diagnostic tooling.
 *
 * No I/O is performed — all data comes from already-initialized module singletons.
 *
 * @returns A {@link HealthSnapshot} reflecting current server state.
 * @example
 * ```typescript
 * const health = getHealthSnapshot();
 * logger.info('Server health', health);
 * ```
 */
export function getHealthSnapshot(): HealthSnapshot {
  return {
    app: {
      name: config.mcpServerName,
      version: config.mcpServerVersion,
      environment: config.environment,
    },
    runtime: {
      isNode: runtimeCaps.isNode,
      isWorkerLike: runtimeCaps.isWorkerLike,
      isBrowserLike: runtimeCaps.isBrowserLike,
    },
    telemetry: {
      enabled: Boolean(config.openTelemetry.enabled),
      diagLevel: config.openTelemetry.logLevel,
    },
    logging: {
      initialized: logger.isInitialized(),
    },
  };
}
