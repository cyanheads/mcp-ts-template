/**
 * @fileoverview Unit tests for the RateLimiter utility.
 * @module tests/utils/security/rateLimiter.test
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
import { trace } from '@opentelemetry/api';

import { JsonRpcErrorCode } from '../../../src/types-global/errors';
import { config } from '../../../src/config/index';
import { logger } from '../../../src/utils/internal/logger';
import { RateLimiter } from '../../../src/utils/security/rateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let debugSpy: MockInstance;
  let originalEnv: string;
  let getActiveSpanSpy: MockInstance;
  const spanMock = {
    setAttribute: vi.fn(),
    setAttributes: vi.fn(),
    addEvent: vi.fn(),
  };

  const createLimiter = () => {
    rateLimiter = new RateLimiter(config, logger as never);
    const timer = (
      rateLimiter as unknown as { cleanupTimer: NodeJS.Timeout | null }
    ).cleanupTimer;
    if (timer) {
      clearInterval(timer);
      (
        rateLimiter as unknown as { cleanupTimer: NodeJS.Timeout | null }
      ).cleanupTimer = null;
    }
    rateLimiter.configure({ cleanupInterval: 0 });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = config.environment;
    config.environment = 'production';
    debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
    getActiveSpanSpy = vi
      .spyOn(trace, 'getActiveSpan')
      .mockReturnValue(spanMock as never);
    createLimiter();
  });

  afterEach(() => {
    const timer = (
      rateLimiter as unknown as { cleanupTimer: NodeJS.Timeout | null }
    ).cleanupTimer;
    if (timer) {
      clearInterval(timer);
    }
    config.environment = originalEnv;
    debugSpy.mockRestore();
    getActiveSpanSpy.mockRestore();
  });

  it('increments counts and throws an McpError after exceeding the limit', () => {
    const context = { requestId: 'req-1', timestamp: new Date().toISOString() };
    rateLimiter.configure({ windowMs: 1000, maxRequests: 1 });

    rateLimiter.check('user:1', context);
    expect(rateLimiter.getStatus('user:1')).toMatchObject({
      current: 1,
      remaining: 0,
    });

    let thrown: unknown;
    try {
      rateLimiter.check('user:1', context);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeDefined();
    expect(thrown as object).toMatchObject({
      code: JsonRpcErrorCode.RateLimited,
    });

    const status = rateLimiter.getStatus('user:1');
    expect(status).toMatchObject({ current: 2, limit: 1, remaining: 0 });
    expect(spanMock.addEvent).toHaveBeenCalledWith('rate_limit_exceeded', {
      'mcp.rate_limit.wait_time_seconds': expect.any(Number),
    });
  });

  it('skips rate limiting in development when configured to do so', () => {
    config.environment = 'development';
    rateLimiter.configure({
      windowMs: 1000,
      maxRequests: 1,
      skipInDevelopment: true,
    });

    const context = {
      requestId: 'dev-req',
      timestamp: new Date().toISOString(),
    };

    expect(() => {
      rateLimiter.check('dev:key', context);
      rateLimiter.check('dev:key', context);
    }).not.toThrow();

    expect(spanMock.setAttribute).toHaveBeenCalledWith(
      'mcp.rate_limit.skipped',
      'development',
    );
  });

  it('resets internal state and logs the action', () => {
    rateLimiter.configure({ windowMs: 1000, maxRequests: 1 });
    rateLimiter.check('to-reset', {
      requestId: 'reset-req',
      timestamp: new Date().toISOString(),
    });

    rateLimiter.reset();

    expect(rateLimiter.getStatus('to-reset')).toBeNull();
    expect(debugSpy).toHaveBeenCalledWith(
      'Rate limiter reset, all limits cleared',
      expect.objectContaining({ operation: 'RateLimiter.reset' }),
    );
  });

  it('cleans up expired entries when the cleanup timer runs', () => {
    const now = Date.now();
    const entryKey = 'expired';
    (
      rateLimiter as unknown as {
        limits: Map<string, { count: number; resetTime: number }>;
      }
    ).limits.set(entryKey, { count: 1, resetTime: now - 1000 });

    (
      rateLimiter as unknown as { cleanupExpiredEntries: () => void }
    ).cleanupExpiredEntries();

    expect(rateLimiter.getStatus(entryKey)).toBeNull();
    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cleaned up 1 expired rate limit entries'),
      expect.objectContaining({
        operation: 'RateLimiter.cleanupExpiredEntries',
      }),
    );
  });
});
