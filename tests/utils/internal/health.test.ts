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
import { diag } from '@opentelemetry/api';

import { config } from '../../../src/config/index';
import { getHealthSnapshot } from '../../../src/utils/internal/health';
import { logger } from '../../../src/utils/internal/logger';
import { runtimeCaps } from '../../../src/utils/internal/runtime';

describe('getHealthSnapshot', () => {
  const diagAny = diag as unknown as { level?: number };
  let originalDiagLevel: number | undefined;
  let isInitializedSpy: MockInstance;

  beforeEach(() => {
    originalDiagLevel = diagAny.level;
    diagAny.level = 42;
    isInitializedSpy = vi.spyOn(logger, 'isInitialized').mockReturnValue(true);
  });

  afterEach(() => {
    diagAny.level = originalDiagLevel;
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
      diagLevel: '42',
    });
    expect(snapshot.logging.initialized).toBe(true);
  });

  it('mirrors changes to the logger state and diag level', () => {
    diagAny.level = undefined;
    isInitializedSpy.mockReturnValue(false);

    const snapshot = getHealthSnapshot();

    expect(snapshot.logging.initialized).toBe(false);
    expect(snapshot.telemetry.diagLevel).toBeUndefined();
  });
});
