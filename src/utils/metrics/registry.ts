/**
 * @fileoverview Lightweight metrics registry over OpenTelemetry metrics API.
 * Provides safe getters for counters and histograms with a no-op fallback
 * when OpenTelemetry is disabled. Prefer using this instead of the raw API
 * to keep instrumentation decoupled from OTel specifics.
 * @module src/utils/metrics/registry
 */
import {
  type Attributes,
  type Counter,
  type Histogram,
  type Meter,
  type MetricOptions,
  metrics,
} from '@opentelemetry/api';

import { config } from '@/config/index.js';

type CounterMap = Map<string, Counter>;
type HistogramMap = Map<string, Histogram>;

const counters: CounterMap = new Map();
const histograms: HistogramMap = new Map();

/**
 * No-op counter implementation for when OpenTelemetry is disabled.
 * Provides a type-safe implementation that matches the Counter interface
 * without unsafe type assertions.
 */
const noOpCounter: Counter = {
  add: () => undefined,
  bind: () => ({ add: () => undefined }),
  unbind: () => undefined,
} as Counter;

/**
 * No-op histogram implementation for when OpenTelemetry is disabled.
 * Provides a type-safe implementation that matches the Histogram interface
 * without unsafe type assertions.
 */
const noOpHistogram: Histogram = {
  record: () => undefined,
  bind: () => ({ record: () => undefined }),
  unbind: () => undefined,
} as Histogram;

/**
 * Gets the OpenTelemetry meter for creating metrics.
 * @returns The configured Meter instance
 */
function getMeter(): Meter {
  return metrics.getMeter(
    config.openTelemetry.serviceName,
    config.openTelemetry.serviceVersion,
  );
}

function isEnabled(): boolean {
  return Boolean(config.openTelemetry.enabled);
}

function getCounter(
  name: string,
  description?: string,
  unit?: string,
): Counter {
  if (!isEnabled()) {
    return noOpCounter;
  }
  const key = `${name}|${description ?? ''}|${unit ?? ''}`;
  const existing = counters.get(key);
  if (existing) return existing;
  const opts: Partial<MetricOptions> = {};
  if (description !== undefined) opts.description = description;
  if (unit !== undefined) opts.unit = unit;
  const counter = Object.keys(opts).length
    ? getMeter().createCounter(name, opts as MetricOptions)
    : getMeter().createCounter(name);
  counters.set(key, counter);
  return counter;
}

function getHistogram(
  name: string,
  description?: string,
  unit?: string,
): Histogram {
  if (!isEnabled()) {
    return noOpHistogram;
  }
  const key = `${name}|${description ?? ''}|${unit ?? ''}`;
  const existing = histograms.get(key);
  if (existing) return existing;
  const opts: Partial<MetricOptions> = {};
  if (description !== undefined) opts.description = description;
  if (unit !== undefined) opts.unit = unit;
  const histogram = Object.keys(opts).length
    ? getMeter().createHistogram(name, opts as MetricOptions)
    : getMeter().createHistogram(name);
  histograms.set(key, histogram);
  return histogram;
}

function add(
  name: string,
  value: number,
  attributes?: Attributes,
  description?: string,
  unit?: string,
): void {
  const c = getCounter(name, description, unit);
  c.add(value, attributes);
}

function record(
  name: string,
  value: number,
  attributes?: Attributes,
  description?: string,
  unit?: string,
): void {
  const h = getHistogram(name, description, unit);
  h.record(value, attributes);
}

export const metricsRegistry = {
  getCounter,
  getHistogram,
  add,
  record,
  enabled: isEnabled,
};
