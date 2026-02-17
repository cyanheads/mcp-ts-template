/**
 * @fileoverview Test suite for ErrorHandler class — Railway Oriented Programming patterns,
 * error classification, retry logic, breadcrumbs, and Result type helpers.
 * @module tests/utils/internal/error-handler/errorHandler.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandler } from '@/utils/internal/error-handler/errorHandler.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import type {
  EnhancedErrorContext,
  ErrorRecoveryStrategy,
  Result,
} from '@/utils/internal/error-handler/types.js';

// Suppress logger output in tests
vi.mock('@/utils/internal/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    crit: vi.fn(),
  },
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── determineErrorCode ──────────────────────────────────────────────────────

  describe('determineErrorCode', () => {
    it('should return McpError code directly', () => {
      const err = new McpError(JsonRpcErrorCode.Forbidden, 'denied');
      expect(ErrorHandler.determineErrorCode(err)).toBe(
        JsonRpcErrorCode.Forbidden,
      );
    });

    it('should map TypeError to ValidationError', () => {
      expect(ErrorHandler.determineErrorCode(new TypeError('bad'))).toBe(
        JsonRpcErrorCode.ValidationError,
      );
    });

    it('should map SyntaxError to ValidationError', () => {
      expect(ErrorHandler.determineErrorCode(new SyntaxError('parse'))).toBe(
        JsonRpcErrorCode.ValidationError,
      );
    });

    it('should map RangeError to ValidationError', () => {
      expect(ErrorHandler.determineErrorCode(new RangeError('out'))).toBe(
        JsonRpcErrorCode.ValidationError,
      );
    });

    it('should map ReferenceError to InternalError', () => {
      expect(ErrorHandler.determineErrorCode(new ReferenceError('undef'))).toBe(
        JsonRpcErrorCode.InternalError,
      );
    });

    it('should classify auth-related message as Unauthorized', () => {
      expect(
        ErrorHandler.determineErrorCode(new Error('unauthorized access')),
      ).toBe(JsonRpcErrorCode.Unauthorized);
    });

    it('should classify permission-related message as Forbidden', () => {
      expect(
        ErrorHandler.determineErrorCode(new Error('permission denied')),
      ).toBe(JsonRpcErrorCode.Forbidden);
    });

    it('should classify not-found message as NotFound', () => {
      expect(
        ErrorHandler.determineErrorCode(new Error('resource not found')),
      ).toBe(JsonRpcErrorCode.NotFound);
    });

    it('should classify validation message as ValidationError', () => {
      expect(
        ErrorHandler.determineErrorCode(new Error('invalid input format')),
      ).toBe(JsonRpcErrorCode.ValidationError);
    });

    it('should classify conflict message as Conflict', () => {
      expect(ErrorHandler.determineErrorCode(new Error('already exists'))).toBe(
        JsonRpcErrorCode.Conflict,
      );
    });

    it('should classify rate limit message as RateLimited', () => {
      expect(
        ErrorHandler.determineErrorCode(new Error('rate limit exceeded')),
      ).toBe(JsonRpcErrorCode.RateLimited);
    });

    it('should classify timeout message as Timeout', () => {
      expect(
        ErrorHandler.determineErrorCode(new Error('request timed out')),
      ).toBe(JsonRpcErrorCode.Timeout);
    });

    it('should classify service unavailable message', () => {
      expect(
        ErrorHandler.determineErrorCode(new Error('service unavailable')),
      ).toBe(JsonRpcErrorCode.ServiceUnavailable);
    });

    it('should classify AbortError special case as Timeout', () => {
      const err = { name: 'AbortError', message: 'signal aborted' };
      expect(ErrorHandler.determineErrorCode(err)).toBe(
        JsonRpcErrorCode.Timeout,
      );
    });

    // Provider-specific patterns
    it('should classify AWS ThrottlingException as RateLimited', () => {
      expect(
        ErrorHandler.determineErrorCode(new Error('ThrottlingException')),
      ).toBe(JsonRpcErrorCode.RateLimited);
    });

    it('should classify HTTP status code 401 as Unauthorized', () => {
      expect(
        ErrorHandler.determineErrorCode(new Error('status code 401')),
      ).toBe(JsonRpcErrorCode.Unauthorized);
    });

    it('should classify ECONNREFUSED as ServiceUnavailable', () => {
      expect(ErrorHandler.determineErrorCode(new Error('ECONNREFUSED'))).toBe(
        JsonRpcErrorCode.ServiceUnavailable,
      );
    });

    it('should default unknown errors to InternalError', () => {
      expect(
        ErrorHandler.determineErrorCode(new Error('something weird')),
      ).toBe(JsonRpcErrorCode.InternalError);
    });

    it('should handle non-Error values', () => {
      expect(ErrorHandler.determineErrorCode('raw string error')).toBe(
        JsonRpcErrorCode.InternalError,
      );
    });
  });

  // ─── handleError ─────────────────────────────────────────────────────────────

  describe('handleError', () => {
    it('should preserve McpError code and return McpError', () => {
      const original = new McpError(JsonRpcErrorCode.NotFound, 'not here', {
        key: 'val',
      });
      const result = ErrorHandler.handleError(original, {
        operation: 'test',
      });
      expect(result).toBeInstanceOf(McpError);
      expect((result as McpError).code).toBe(JsonRpcErrorCode.NotFound);
    });

    it('should wrap generic Error as McpError', () => {
      const result = ErrorHandler.handleError(new Error('generic'), {
        operation: 'testOp',
      });
      expect(result).toBeInstanceOf(McpError);
      expect(result.message).toContain('testOp');
      expect(result.message).toContain('generic');
    });

    it('should rethrow when rethrow option is true', () => {
      expect(() =>
        ErrorHandler.handleError(new Error('boom'), {
          operation: 'test',
          rethrow: true,
        }),
      ).toThrow();
    });

    it('should return error without throwing when rethrow is false', () => {
      const result = ErrorHandler.handleError(new Error('safe'), {
        operation: 'test',
        rethrow: false,
      });
      expect(result).toBeInstanceOf(Error);
    });

    it('should use explicit errorCode when provided', () => {
      const result = ErrorHandler.handleError(new Error('test'), {
        operation: 'op',
        errorCode: JsonRpcErrorCode.Timeout,
      });
      expect((result as McpError).code).toBe(JsonRpcErrorCode.Timeout);
    });

    it('should use custom errorMapper when provided', () => {
      const custom = new Error('custom mapped');
      const result = ErrorHandler.handleError(new Error('original'), {
        operation: 'op',
        errorMapper: () => custom,
      });
      expect(result).toBe(custom);
    });

    it('should handle non-Error values', () => {
      const result = ErrorHandler.handleError('string error', {
        operation: 'op',
      });
      expect(result).toBeInstanceOf(McpError);
      expect(result.message).toContain('string error');
    });

    it('should include breadcrumbs from enhanced context', () => {
      const context: EnhancedErrorContext = {
        requestId: 'req-1',
        timestamp: new Date().toISOString(),
        operation: 'op',
        metadata: {
          breadcrumbs: [
            { timestamp: new Date().toISOString(), operation: 'step1' },
          ],
        },
      };
      const result = ErrorHandler.handleError(new Error('fail'), {
        operation: 'op',
        context,
      }) as McpError;
      expect(result.data).toBeDefined();
      expect(result.data?.breadcrumbs).toBeDefined();
    });
  });

  // ─── formatError ─────────────────────────────────────────────────────────────

  describe('formatError', () => {
    it('should format McpError with code, message, data', () => {
      const err = new McpError(JsonRpcErrorCode.InvalidParams, 'bad', {
        field: 'x',
      });
      const formatted = ErrorHandler.formatError(err);
      expect(formatted).toMatchObject({
        code: JsonRpcErrorCode.InvalidParams,
        message: 'bad',
        data: { field: 'x' },
      });
    });

    it('should format generic Error', () => {
      const formatted = ErrorHandler.formatError(new TypeError('wrong'));
      expect(formatted).toMatchObject({
        code: JsonRpcErrorCode.ValidationError,
        message: 'wrong',
        data: { errorType: 'TypeError' },
      });
    });

    it('should format non-Error values', () => {
      const formatted = ErrorHandler.formatError('raw');
      expect(formatted.code).toBe(JsonRpcErrorCode.UnknownError);
      expect(formatted.message).toBe('raw');
    });

    it('should format null value', () => {
      const formatted = ErrorHandler.formatError(null);
      expect(formatted.code).toBe(JsonRpcErrorCode.UnknownError);
    });
  });

  // ─── tryCatch ────────────────────────────────────────────────────────────────

  describe('tryCatch', () => {
    it('should return value on success', async () => {
      const result = await ErrorHandler.tryCatch(() => Promise.resolve(42), {
        operation: 'test',
      });
      expect(result).toBe(42);
    });

    it('should throw McpError on failure', async () => {
      await expect(
        ErrorHandler.tryCatch(
          () => {
            throw new Error('fail');
          },
          { operation: 'test' },
        ),
      ).rejects.toThrow(McpError);
    });

    it('should handle sync functions', async () => {
      const result = await ErrorHandler.tryCatch(() => 'sync', {
        operation: 'test',
      });
      expect(result).toBe('sync');
    });
  });

  // ─── tryAsResult ─────────────────────────────────────────────────────────────

  describe('tryAsResult', () => {
    it('should return ok result on success', async () => {
      const result = await ErrorHandler.tryAsResult(
        () => Promise.resolve('data'),
        { operation: 'test' },
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('data');
      }
    });

    it('should return error result on failure', async () => {
      const result = await ErrorHandler.tryAsResult(
        () => {
          throw new Error('fail');
        },
        { operation: 'test' },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(McpError);
      }
    });

    it('should handle sync functions returning value', async () => {
      const result = await ErrorHandler.tryAsResult(() => 123, {
        operation: 'test',
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(123);
    });
  });

  // ─── mapResult ───────────────────────────────────────────────────────────────

  describe('mapResult', () => {
    it('should map success value', () => {
      const input: Result<number, McpError> = { ok: true, value: 5 };
      const mapped = ErrorHandler.mapResult(input, (n) => n * 2);
      expect(mapped.ok).toBe(true);
      if (mapped.ok) expect(mapped.value).toBe(10);
    });

    it('should pass through error result unchanged', () => {
      const err = new McpError(JsonRpcErrorCode.NotFound, 'nope');
      const input: Result<number, McpError> = { ok: false, error: err };
      const mapped = ErrorHandler.mapResult(input, (n) => n * 2);
      expect(mapped.ok).toBe(false);
      if (!mapped.ok) expect(mapped.error).toBe(err);
    });

    it('should catch mapping function exception and return error result', () => {
      const input: Result<number, McpError> = { ok: true, value: 5 };
      const mapped = ErrorHandler.mapResult(input, () => {
        throw new Error('mapper broke');
      });
      expect(mapped.ok).toBe(false);
      if (!mapped.ok) {
        expect(mapped.error.message).toContain('mapper broke');
      }
    });
  });

  // ─── flatMapResult ───────────────────────────────────────────────────────────

  describe('flatMapResult', () => {
    it('should chain success results', () => {
      const input: Result<number, McpError> = { ok: true, value: 3 };
      const chained = ErrorHandler.flatMapResult(input, (n) => ({
        ok: true,
        value: `val-${n}`,
      }));
      expect(chained.ok).toBe(true);
      if (chained.ok) expect(chained.value).toBe('val-3');
    });

    it('should short-circuit on error', () => {
      const err = new McpError(JsonRpcErrorCode.InternalError, 'fail');
      const input: Result<number, McpError> = { ok: false, error: err };
      const fn = vi.fn();
      const chained = ErrorHandler.flatMapResult(input, fn);
      expect(chained.ok).toBe(false);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  // ─── recoverResult ───────────────────────────────────────────────────────────

  describe('recoverResult', () => {
    it('should return success value when ok', () => {
      const input: Result<string, McpError> = { ok: true, value: 'good' };
      expect(ErrorHandler.recoverResult(input, 'fallback')).toBe('good');
    });

    it('should return static fallback on error', () => {
      const err = new McpError(JsonRpcErrorCode.NotFound, 'gone');
      const input: Result<string, McpError> = { ok: false, error: err };
      expect(ErrorHandler.recoverResult(input, 'default')).toBe('default');
    });

    it('should call factory fallback on error', () => {
      const err = new McpError(JsonRpcErrorCode.NotFound, 'gone');
      const input: Result<string, McpError> = { ok: false, error: err };
      const result = ErrorHandler.recoverResult(
        input,
        (e) => `recovered: ${e.message}`,
      );
      expect(result).toBe('recovered: gone');
    });
  });

  // ─── addBreadcrumb ───────────────────────────────────────────────────────────

  describe('addBreadcrumb', () => {
    it('should add a breadcrumb to empty context', () => {
      const ctx: EnhancedErrorContext = { requestId: 'r1' };
      const result = ErrorHandler.addBreadcrumb(ctx, 'step1');
      expect(result.metadata?.breadcrumbs).toHaveLength(1);
      expect(result.metadata!.breadcrumbs![0]!.operation).toBe('step1');
    });

    it('should accumulate multiple breadcrumbs', () => {
      let ctx: EnhancedErrorContext = { requestId: 'r1' };
      ctx = ErrorHandler.addBreadcrumb(ctx, 'step1');
      ctx = ErrorHandler.addBreadcrumb(ctx, 'step2');
      ctx = ErrorHandler.addBreadcrumb(ctx, 'step3');
      expect(ctx.metadata?.breadcrumbs).toHaveLength(3);
    });

    it('should include additionalData when provided', () => {
      const ctx: EnhancedErrorContext = { requestId: 'r1' };
      const result = ErrorHandler.addBreadcrumb(ctx, 'op', { userId: '123' });
      expect(result.metadata!.breadcrumbs![0]!.context).toEqual({
        userId: '123',
      });
    });

    it('should not include context key when additionalData is undefined', () => {
      const ctx: EnhancedErrorContext = { requestId: 'r1' };
      const result = ErrorHandler.addBreadcrumb(ctx, 'op');
      expect(result.metadata!.breadcrumbs![0]).not.toHaveProperty('context');
    });

    it('should include timestamp on each breadcrumb', () => {
      const ctx: EnhancedErrorContext = {};
      const result = ErrorHandler.addBreadcrumb(ctx, 'op');
      expect(result.metadata!.breadcrumbs![0]!.timestamp).toBeDefined();
    });
  });

  // ─── tryCatchWithRetry ───────────────────────────────────────────────────────

  describe('tryCatchWithRetry', () => {
    it('should return value on first successful attempt', async () => {
      const fn = vi.fn().mockResolvedValue('ok');
      const strategy: ErrorRecoveryStrategy = {
        maxAttempts: 3,
        shouldRetry: () => true,
        getRetryDelay: () => 0,
      };
      const result = await ErrorHandler.tryCatchWithRetry(
        fn,
        { operation: 'test' },
        strategy,
      );
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry and succeed on subsequent attempt', async () => {
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount++;
        if (callCount < 3) throw new Error('transient');
        return 'recovered';
      });
      const strategy: ErrorRecoveryStrategy = {
        maxAttempts: 5,
        shouldRetry: () => true,
        getRetryDelay: () => 0,
      };
      const result = await ErrorHandler.tryCatchWithRetry(
        fn,
        { operation: 'test' },
        strategy,
      );
      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts exhausted', async () => {
      const fn = vi.fn(async () => {
        throw new Error('always fails');
      });
      const strategy: ErrorRecoveryStrategy = {
        maxAttempts: 2,
        shouldRetry: () => true,
        getRetryDelay: () => 0,
      };
      await expect(
        ErrorHandler.tryCatchWithRetry(fn, { operation: 'test' }, strategy),
      ).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const fn = vi.fn(async () => {
        throw new McpError(JsonRpcErrorCode.ValidationError, 'bad input');
      });
      const strategy: ErrorRecoveryStrategy = {
        maxAttempts: 5,
        shouldRetry: (error) => {
          if (error instanceof McpError) {
            return error.code !== JsonRpcErrorCode.ValidationError;
          }
          return true;
        },
        getRetryDelay: () => 0,
      };
      await expect(
        ErrorHandler.tryCatchWithRetry(fn, { operation: 'test' }, strategy),
      ).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should invoke onRetry callback before each retry', async () => {
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount++;
        if (callCount < 3) throw new Error('transient');
        return 'ok';
      });
      const onRetry = vi.fn();
      const strategy: ErrorRecoveryStrategy = {
        maxAttempts: 5,
        shouldRetry: () => true,
        getRetryDelay: () => 0,
        onRetry,
      };
      await ErrorHandler.tryCatchWithRetry(fn, { operation: 'test' }, strategy);
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 2);
    });
  });

  // ─── createExponentialBackoffStrategy ────────────────────────────────────────

  describe('createExponentialBackoffStrategy', () => {
    it('should create strategy with default params', () => {
      const strategy = ErrorHandler.createExponentialBackoffStrategy();
      expect(strategy.maxAttempts).toBe(3);
    });

    it('should create strategy with custom params', () => {
      const strategy = ErrorHandler.createExponentialBackoffStrategy(
        5,
        500,
        10000,
      );
      expect(strategy.maxAttempts).toBe(5);
    });

    it('should not retry ValidationError', () => {
      const strategy = ErrorHandler.createExponentialBackoffStrategy();
      const err = new McpError(JsonRpcErrorCode.ValidationError, 'bad');
      expect(strategy.shouldRetry(err, 1)).toBe(false);
    });

    it('should not retry Unauthorized', () => {
      const strategy = ErrorHandler.createExponentialBackoffStrategy();
      const err = new McpError(JsonRpcErrorCode.Unauthorized, 'denied');
      expect(strategy.shouldRetry(err, 1)).toBe(false);
    });

    it('should not retry Forbidden', () => {
      const strategy = ErrorHandler.createExponentialBackoffStrategy();
      const err = new McpError(JsonRpcErrorCode.Forbidden, 'nope');
      expect(strategy.shouldRetry(err, 1)).toBe(false);
    });

    it('should not retry NotFound', () => {
      const strategy = ErrorHandler.createExponentialBackoffStrategy();
      const err = new McpError(JsonRpcErrorCode.NotFound, 'gone');
      expect(strategy.shouldRetry(err, 1)).toBe(false);
    });

    it('should retry InternalError', () => {
      const strategy = ErrorHandler.createExponentialBackoffStrategy();
      const err = new McpError(JsonRpcErrorCode.InternalError, 'oops');
      expect(strategy.shouldRetry(err, 1)).toBe(true);
    });

    it('should retry generic Error', () => {
      const strategy = ErrorHandler.createExponentialBackoffStrategy();
      expect(strategy.shouldRetry(new Error('network'), 1)).toBe(true);
    });

    it('should calculate delay with exponential backoff capped at maxDelay', () => {
      const strategy = ErrorHandler.createExponentialBackoffStrategy(
        5,
        1000,
        5000,
      );
      const delay1 = strategy.getRetryDelay(1);
      const delay3 = strategy.getRetryDelay(3);
      const delay10 = strategy.getRetryDelay(10);

      // Attempt 1: base * 2^0 = 1000 + jitter (0-300)
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1300);

      // Attempt 3: base * 2^2 = 4000 + jitter (0-1200)
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThanOrEqual(5200);

      // Attempt 10: should be capped at maxDelay (5000)
      expect(delay10).toBeLessThanOrEqual(5000);
    });
  });

  // ─── mapError ────────────────────────────────────────────────────────────────

  describe('mapError', () => {
    it('should call factory when pattern matches error message', () => {
      const custom = new Error('custom');
      const mappings = [
        {
          pattern: /timeout/i,
          errorCode: JsonRpcErrorCode.Timeout,
          factory: () => custom,
        },
      ];
      const result = ErrorHandler.mapError(
        new Error('connection timeout'),
        mappings,
      );
      expect(result).toBe(custom);
    });

    it('should use defaultFactory when no pattern matches', () => {
      const fallback = new Error('fallback');
      const mappings = [
        {
          pattern: /never-match/,
          errorCode: JsonRpcErrorCode.Timeout,
          factory: () => new Error('not this'),
        },
      ];
      const result = ErrorHandler.mapError(
        new Error('something else'),
        mappings,
        () => fallback,
      );
      expect(result).toBe(fallback);
    });

    it('should return original error when no match and no defaultFactory', () => {
      const original = new Error('original');
      const result = ErrorHandler.mapError(original, []);
      expect(result).toBe(original);
    });

    it('should wrap non-Error input when no match and no defaultFactory', () => {
      const result = ErrorHandler.mapError('string error', []);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('string error');
    });
  });
});
