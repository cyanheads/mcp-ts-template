/**
 * @fileoverview Unit tests for the health snapshot utility.
 * @module tests/utils/internal/health.test
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { diag, DiagLogLevel } from '@opentelemetry/api';

import { config } from '../../../src/config/index.js';
import { getHealthSnapshot } from '../../../src/utils/internal/health.js';
import { logger } from '../../../src/utils/internal/logger.js';
import { runtimeCaps } from '../../../src/utils/internal/runtime.js';

describe('getHealthSnapshot', () => {
  const diagAny = diag as unknown as { level?: number };
  let originalDiagLevel: number | undefined;
  let isInitializedSpy: MockInstance;

  beforeEach(() => {
    originalDiagLevel = diagAny.level;
    diagAny.level = DiagLogLevel.INFO;
    isInitializedSpy = vi.spyOn(logger, 'isInitialized').mockReturnValue(true);
  });

  afterEach(() => {
    if (originalDiagLevel !== undefined) {
      diagAny.level = originalDiagLevel;
    }
    isInitializedSpy.mockRestore();
  });

  it('reflects config, runtime, telemetry, and logger state in the snapshot', () => {
    const snapshot = getHealthSnapshot();

    expect(snapshot.app).toEqual({
      name: config.mcpServerName,
      version: config.mcpServerVersion,
      environment: config.environment,
    });
    expect(snapshot.runtime).toEqual({
      isNode: runtimeCaps.isNode,
      isWorkerLike: runtimeCaps.isWorkerLike,
      isBrowserLike: runtimeCaps.isBrowserLike,
    });
    expect(snapshot.telemetry).toEqual({
      enabled: Boolean(config.openTelemetry.enabled),
      diagLevel: 'INFO',
    });
    expect(snapshot.logging.initialized).toBe(true);
  });

  it('mirrors changes to the logger state and diag level', () => {
    // Temporarily mock the config value for this specific test
    const originalLogLevel = config.openTelemetry.logLevel;
    config.openTelemetry.logLevel = 'NONE';
    isInitializedSpy.mockReturnValue(false);

    const snapshot = getHealthSnapshot();

    expect(snapshot.logging.initialized).toBe(false);
    expect(snapshot.telemetry.diagLevel).toBe('NONE');

    // Restore original config value
    config.openTelemetry.logLevel = originalLogLevel;
  });
});
