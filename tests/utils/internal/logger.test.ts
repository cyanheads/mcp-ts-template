/**
 * @fileoverview Unit tests for the Logger class.
 * Tests rate-limiting, RFC5424 level mapping, singleton behavior,
 * and state management without requiring file I/O.
 * @module tests/utils/internal/logger
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Logger, type McpLogLevel } from '@/utils/internal/logger.js';

// Mock pino to avoid file I/O in unit tests
vi.mock('pino', () => {
  const mockPinoLogger = {
    fatal: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    level: 'info',
    flush: vi.fn((cb: (err?: Error) => void) => cb()),
  };

  const pino = vi.fn(() => mockPinoLogger) as any;
  pino.stdSerializers = {
    err: vi.fn((err: Error) => ({
      type: err.constructor.name,
      message: err.message,
      stack: err.stack,
    })),
  };

  return { default: pino };
});

// Mock config
vi.mock('@/config/index.js', () => ({
  config: {
    environment: 'testing',
    mcpServerVersion: '1.0.0-test',
    logsPath: undefined,
  },
}));

// Mock sanitization
vi.mock('@/utils/security/sanitization.js', () => ({
  sanitization: {
    getSensitivePinoFields: vi.fn(() => [
      'password',
      'secret',
      'token',
      'authorization',
    ]),
  },
}));

// Mock requestContextService
vi.mock('@/utils/internal/requestContext.js', () => ({
  requestContextService: {
    createRequestContext: vi.fn((overrides = {}) => ({
      requestId: 'mock-req-id',
      timestamp: new Date().toISOString(),
      ...overrides,
    })),
  },
}));

describe('Logger', () => {
  let logger: Logger;

  beforeEach(async () => {
    vi.clearAllMocks();
    logger = Logger.getInstance();

    // Force close + reset to get a clean state
    if (logger.isInitialized()) {
      await logger.close();
    }
  });

  afterEach(async () => {
    if (logger.isInitialized()) {
      await logger.close();
    }
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const a = Logger.getInstance();
      const b = Logger.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('initialize', () => {
    it('should set initialized to true after init', async () => {
      expect(logger.isInitialized()).toBe(false);
      await logger.initialize('info');
      expect(logger.isInitialized()).toBe(true);
    });

    it('should not re-initialize if already initialized', async () => {
      await logger.initialize('info');
      const spy = vi.spyOn(logger, 'warning');

      await logger.initialize('debug');

      expect(spy).toHaveBeenCalledWith(
        'Logger already initialized.',
        expect.any(Object),
      );
      spy.mockRestore();
    });
  });

  describe('level mapping (RFC5424 → Pino)', () => {
    it('should not throw for any MCP log level', async () => {
      const levels: McpLogLevel[] = [
        'debug',
        'info',
        'notice',
        'warning',
        'error',
        'crit',
        'alert',
        'emerg',
      ];

      for (const level of levels) {
        // Reset
        if (logger.isInitialized()) await logger.close();
        await logger.initialize(level);
        expect(logger.isInitialized()).toBe(true);
        await logger.close();
      }
    });
  });

  describe('setLevel', () => {
    it('should change log level after initialization', async () => {
      await logger.initialize('info');
      logger.setLevel('debug');

      // Should not throw
      logger.debug('test debug after level change');
    });

    it('should not throw when not initialized', () => {
      // Just logs to console.error if TTY, but should not throw
      expect(() => logger.setLevel('debug')).not.toThrow();
    });
  });

  describe('close', () => {
    it('should set initialized to false after close', async () => {
      await logger.initialize('info');
      expect(logger.isInitialized()).toBe(true);

      await logger.close();
      expect(logger.isInitialized()).toBe(false);
    });

    it('should be safe to call close when not initialized', async () => {
      await expect(logger.close()).resolves.toBeUndefined();
    });
  });

  describe('rate limiting', () => {
    it('should allow messages under the threshold', async () => {
      await logger.initialize('info');

      // Rate limit threshold is 10 within 60s window.
      // First 10 calls should not be rate-limited.
      for (let i = 0; i < 10; i++) {
        logger.info('repeated message');
      }

      // Access the internal pino logger to check call count
      const pino = (await import('pino')).default;
      const mockLogger = pino() as any;
      // The info method should have been called (includes init messages + our 10)
      expect(mockLogger.info.mock.calls.length).toBeGreaterThanOrEqual(10);
    });

    it('should suppress messages over the threshold', async () => {
      await logger.initialize('info');

      const pino = (await import('pino')).default;
      const mockLogger = pino() as any;
      const initialCallCount = mockLogger.info.mock.calls.length;

      // Fire 15 identical messages — last 5 should be suppressed
      for (let i = 0; i < 15; i++) {
        logger.info('rate-limited-msg');
      }

      const callsAfter = mockLogger.info.mock.calls.length - initialCallCount;
      // Should have logged 10 (threshold), not 15
      expect(callsAfter).toBeLessThanOrEqual(10);
    });

    it('should not rate-limit different messages independently', async () => {
      await logger.initialize('info');

      // 10 of message A + 10 of message B = both under threshold
      for (let i = 0; i < 10; i++) {
        logger.info('message-A');
        logger.info('message-B');
      }

      // Neither should be suppressed since each is at the threshold, not over
      const pino = (await import('pino')).default;
      const mockLogger = pino() as any;
      // All 20 messages should have been logged (plus init messages)
      expect(mockLogger.info.mock.calls.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('error-level methods', () => {
    it('error() should accept Error object as second arg', async () => {
      await logger.initialize('info');
      const err = new Error('test error');

      expect(() => logger.error('Something failed', err)).not.toThrow();
    });

    it('error() should accept context as second arg', async () => {
      await logger.initialize('info');
      const ctx = { requestId: 'r1', timestamp: new Date().toISOString() };

      expect(() => logger.error('Something failed', ctx as any)).not.toThrow();
    });

    it('crit() should accept Error + context', async () => {
      await logger.initialize('info');
      const err = new Error('critical');
      const ctx = { requestId: 'r2', timestamp: new Date().toISOString() };

      expect(() =>
        logger.crit('Critical failure', err, ctx as any),
      ).not.toThrow();
    });

    it('fatal() should delegate to emerg()', async () => {
      await logger.initialize('info');
      const spy = vi.spyOn(logger, 'emerg');

      const ctx = {
        requestId: 'r3',
        timestamp: new Date().toISOString(),
      } as any;
      logger.fatal('fatal condition', ctx);

      // fatal(msg, errorOrContext, context?) forwards all args to emerg()
      expect(spy).toHaveBeenCalledWith('fatal condition', ctx, undefined);
      spy.mockRestore();
    });
  });

  describe('logInteraction', () => {
    it('should warn when interaction logger is not available', async () => {
      await logger.initialize('info');

      // Force interactionLogger to undefined (no logsPath in test config)
      const spy = vi.spyOn(logger, 'warning');

      logger.logInteraction('test', {
        context: { requestId: 'int-1', timestamp: new Date().toISOString() },
      });

      // In testing env without logsPath, interactionLogger is undefined
      // so it should warn
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('log level filtering', () => {
    it('should not log debug messages when level is set to warning', async () => {
      await logger.initialize('warning');

      const pino = (await import('pino')).default;
      const mockLogger = pino() as any;
      const initialDebugCalls = mockLogger.debug.mock.calls.length;

      logger.debug('this should be filtered');

      expect(mockLogger.debug.mock.calls.length).toBe(initialDebugCalls);
    });

    it('should log error messages when level is set to warning', async () => {
      await logger.initialize('warning');

      const pino = (await import('pino')).default;
      const mockLogger = pino() as any;
      const initialErrorCalls = mockLogger.error.mock.calls.length;

      logger.error('this should pass', {
        requestId: 'r4',
        timestamp: new Date().toISOString(),
      } as any);

      expect(mockLogger.error.mock.calls.length).toBeGreaterThan(
        initialErrorCalls,
      );
    });
  });
});
