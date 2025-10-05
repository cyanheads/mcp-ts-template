/**
 * @fileoverview Unit tests for the requestContextService utilities.
 * @module tests/utils/internal/requestContext.test
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
import { trace, type Span } from '@opentelemetry/api';

import * as utilsIndex from '../../../src/utils/index.js';
import { logger } from '../../../src/utils/internal/logger.js';
import { requestContextService } from '../../../src/utils/internal/requestContext.js';
import { authContext } from '../../../src/mcp-server/transports/auth/lib/authContext.js';

describe('requestContextService', () => {
  let debugSpy: MockInstance;
  let idSpy: MockInstance;
  let getActiveSpanSpy: MockInstance;
  let originalConfig: Record<string, unknown>;

  beforeEach(() => {
    debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
    getActiveSpanSpy = vi
      .spyOn(trace, 'getActiveSpan')
      .mockReturnValue(undefined as unknown as Span);
    originalConfig = {
      ...(
        requestContextService as unknown as { config: Record<string, unknown> }
      ).config,
    };
    idSpy = vi
      .spyOn(utilsIndex, 'generateRequestContextId')
      .mockReturnValue('CTX-TEST-ID');
  });

  afterEach(() => {
    (
      requestContextService as unknown as { config: Record<string, unknown> }
    ).config = {
      ...originalConfig,
    };
    debugSpy.mockRestore();
    idSpy.mockRestore();
    getActiveSpanSpy.mockRestore();
  });

  it('merges configuration updates and logs the change', () => {
    const result = requestContextService.configure({ featureFlag: true });

    expect(result.featureFlag).toBe(true);
    expect(debugSpy).toHaveBeenCalledWith(
      'RequestContextService configuration updated',
      expect.objectContaining({ operation: 'RequestContextService.configure' }),
    );
  });

  it('returns a defensive copy when reading the current configuration', () => {
    requestContextService.configure({ featureFlag: true });

    const snapshot = requestContextService.getConfig();
    expect(snapshot.featureFlag).toBe(true);

    // Mutating the snapshot should not affect the internal state.
    (snapshot as { featureFlag?: boolean }).featureFlag = false;
    expect(requestContextService.getConfig().featureFlag).toBe(true);
  });

  it('creates a context with generated IDs, added fields, and trace metadata', () => {
    const spanContext = { traceId: 'trace-id', spanId: 'span-id' };
    getActiveSpanSpy.mockReturnValue({
      spanContext: () => spanContext,
    } as never);

    const context = requestContextService.createRequestContext({
      additionalContext: { extra: 'value' },
      operation: 'UnitTest',
      tenantId: 'manual-tenant',
    });

    expect(context.requestId).toBe('CTX-TEST-ID');
    expect(context.operation).toBe('UnitTest');
    expect(context.extra).toBe('value');
    expect(context.tenantId).toBe('manual-tenant');
    expect(context.traceId).toBe('trace-id');
    expect(context.spanId).toBe('span-id');
  });

  it('inherits data from a parent context and prefers explicit tenant overrides', () => {
    const parent = requestContextService.createRequestContext({
      additionalContext: { parentOnly: true },
      tenantId: 'parent-tenant',
    });

    const child = requestContextService.createRequestContext({
      parentContext: parent,
      additionalContext: { childOnly: true },
      tenantId: 'child-tenant',
    });

    expect(child.requestId).toBe(parent.requestId);
    expect(child.parentOnly).toBe(true);
    expect(child.childOnly).toBe(true);
    expect(child.tenantId).toBe('child-tenant');
  });

  it('falls back to the auth context tenant when none is provided elsewhere', async () => {
    await new Promise<void>((resolve) => {
      authContext.run(
        {
          authInfo: {
            subject: 'user-1',
            scopes: ['scope:a'],
            tenantId: 'auth-tenant',
            token: 'test-token',
            clientId: 'test-client',
          },
        },
        () => {
          const context = requestContextService.createRequestContext();
          expect(context.tenantId).toBe('auth-tenant');
          resolve();
        },
      );
    });
  });
});
