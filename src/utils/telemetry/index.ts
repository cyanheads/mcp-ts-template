/**
 * @fileoverview Barrel for telemetry utilities (instrumentation and semconv).
 * Importing `instrumentation` initializes OpenTelemetry when enabled.
 * @module src/utils/telemetry
 */

export * from './instrumentation.js';
export * from './semconv.js';
export * from './trace.js';
