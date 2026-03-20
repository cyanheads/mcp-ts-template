/**
 * @fileoverview Test suite for ErrorHandler class — error classification, formatting,
 * tryCatch, mapError, and handleError behavior.
 * @module tests/utils/internal/error-handler/errorHandler.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { ErrorHandler } from '@/utils/internal/error-handler/errorHandler.js';

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
      expect(ErrorHandler.determineErrorCode(err)).toBe(JsonRpcErrorCode.Forbidden);
    });

    it('should map TypeError to ValidationError', () => {
      expect(ErrorHandler.determineErrorCode(new TypeError('bad'))).toBe(
        JsonRpcErrorCode.InternalError,
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
      expect(ErrorHandler.determineErrorCode(new Error('unauthorized access'))).toBe(
        JsonRpcErrorCode.Unauthorized,
      );
    });

    it('should not misclassify "Invalid auth token format" as Unauthorized', () => {
      // Regression: bare "auth" substring previously matched Unauthorized
      expect(ErrorHandler.determineErrorCode(new Error('Invalid auth token format'))).not.toBe(
        JsonRpcErrorCode.Unauthorized,
      );
    });

    it('should not misclassify "missing required field" as NotFound', () => {
      // Regression: bare "missing" previously matched NotFound before ValidationError
      expect(ErrorHandler.determineErrorCode(new Error('missing required field: name'))).toBe(
        JsonRpcErrorCode.ValidationError,
      );
    });

    it('should classify permission-related message as Forbidden', () => {
      expect(ErrorHandler.determineErrorCode(new Error('permission denied'))).toBe(
        JsonRpcErrorCode.Forbidden,
      );
    });

    it('should classify not-found message as NotFound', () => {
      expect(ErrorHandler.determineErrorCode(new Error('resource not found'))).toBe(
        JsonRpcErrorCode.NotFound,
      );
    });

    it('should classify validation message as ValidationError', () => {
      expect(ErrorHandler.determineErrorCode(new Error('invalid input format'))).toBe(
        JsonRpcErrorCode.ValidationError,
      );
    });

    it('should classify conflict message as Conflict', () => {
      expect(ErrorHandler.determineErrorCode(new Error('already exists'))).toBe(
        JsonRpcErrorCode.Conflict,
      );
    });

    it('should classify rate limit message as RateLimited', () => {
      expect(ErrorHandler.determineErrorCode(new Error('rate limit exceeded'))).toBe(
        JsonRpcErrorCode.RateLimited,
      );
    });

    it('should classify timeout message as Timeout', () => {
      expect(ErrorHandler.determineErrorCode(new Error('request timed out'))).toBe(
        JsonRpcErrorCode.Timeout,
      );
    });

    it('should classify service unavailable message', () => {
      expect(ErrorHandler.determineErrorCode(new Error('service unavailable'))).toBe(
        JsonRpcErrorCode.ServiceUnavailable,
      );
    });

    it('should classify AbortError special case as Timeout', () => {
      const err = { name: 'AbortError', message: 'signal aborted' };
      expect(ErrorHandler.determineErrorCode(err)).toBe(JsonRpcErrorCode.Timeout);
    });

    // Provider-specific patterns
    it('should classify AWS ThrottlingException as RateLimited', () => {
      expect(ErrorHandler.determineErrorCode(new Error('ThrottlingException'))).toBe(
        JsonRpcErrorCode.RateLimited,
      );
    });

    it('should classify HTTP status code 401 as Unauthorized', () => {
      expect(ErrorHandler.determineErrorCode(new Error('status code 401'))).toBe(
        JsonRpcErrorCode.Unauthorized,
      );
    });

    it('should classify ECONNREFUSED as ServiceUnavailable', () => {
      expect(ErrorHandler.determineErrorCode(new Error('ECONNREFUSED'))).toBe(
        JsonRpcErrorCode.ServiceUnavailable,
      );
    });

    it('should default unknown errors to InternalError', () => {
      expect(ErrorHandler.determineErrorCode(new Error('something weird'))).toBe(
        JsonRpcErrorCode.InternalError,
      );
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

    it('should extract cause chain when error has a cause', () => {
      const root = new Error('root cause');
      const outer = new Error('outer', { cause: root });
      const result = ErrorHandler.handleError(outer, {
        operation: 'op',
      }) as McpError;
      expect(result.data).toBeDefined();
      expect(result.data?.rootCause).toEqual({
        name: 'Error',
        message: 'root cause',
      });
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
        code: JsonRpcErrorCode.InternalError,
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
      const result = ErrorHandler.mapError(new Error('connection timeout'), mappings);
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
      const result = ErrorHandler.mapError(new Error('something else'), mappings, () => fallback);
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
