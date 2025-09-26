/**
 * @fileoverview Unit tests targeting uncovered branches in ErrorHandler.
 * @module tests/utils/internal/errorHandler.unit.test
 */
import { trace } from '@opentelemetry/api';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from 'vitest';

import {
  JsonRpcErrorCode,
  McpError,
} from '../../../src/types-global/errors.js';
import { ErrorHandler } from '../../../src/utils/internal/errorHandler.js';
import { logger } from '../../../src/utils/internal/logger.js';

describe('ErrorHandler (unit)', () => {
  let getActiveSpanSpy: MockInstance;
  let errorSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    getActiveSpanSpy = vi.spyOn(trace, 'getActiveSpan').mockReturnValue({
      recordException: vi.fn(),
      setStatus: vi.fn(),
    } as never);
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    getActiveSpanSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('determineErrorCode - additional branches', () => {
    it('maps AbortError name to Timeout', () => {
      const err = new Error('operation aborted');
      (err as any).name = 'AbortError';
      expect(ErrorHandler.determineErrorCode(err)).toBe(
        JsonRpcErrorCode.Timeout,
      );
    });
  });

  describe('formatError - non-Error input', () => {
    it('returns UnknownError for non-Error values and includes errorType', () => {
      const formatted = ErrorHandler.formatError(42);
      expect(formatted).toMatchObject({
        code: JsonRpcErrorCode.UnknownError,
        message: '42',
        data: { errorType: 'numberEncountered' },
      });
    });
  });

  describe('mapError - defaultFactory path', () => {
    it('uses defaultFactory when no mapping rule matches', () => {
      const result = ErrorHandler.mapError(
        'no-match',
        [],
        (e: unknown) => new TypeError(`Default mapped: ${String(e)}`),
      );
      expect(result).toBeInstanceOf(TypeError);
      expect((result as TypeError).message).toBe('Default mapped: no-match');
    });

    it('applies a mapping rule when pattern matches', () => {
      const result = ErrorHandler.mapError(
        new Error('specific failure occurred'),
        [
          {
            pattern: /specific/i,
            errorCode: JsonRpcErrorCode.ValidationError, // not used by map factory directly here
            factory: () => new RangeError('Mapped by rule'),
          },
        ],
      );
      expect(result).toBeInstanceOf(RangeError);
      expect((result as RangeError).message).toBe('Mapped by rule');
    });
  });

  describe('handleError - includeStack, explicit code, critical', () => {
    it('omits stack when includeStack is false and respects explicit errorCode and critical flag', () => {
      const err = new Error('network down');
      err.stack = 'STACK_LINE_1\nSTACK_LINE_2';
      const final = ErrorHandler.handleError(err, {
        operation: 'explicitCodeTest',
        context: { requestId: 'rid-1' },
        input: { foo: 'bar' },
        includeStack: false,
        critical: true,
        errorCode: JsonRpcErrorCode.ServiceUnavailable,
      });

      // Returned error
      expect(final).toBeInstanceOf(McpError);
      expect((final as McpError).code).toBe(
        JsonRpcErrorCode.ServiceUnavailable,
      );

      // Logged context
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const call = errorSpy.mock.calls[0];
      if (!call) throw new Error('errorSpy was not called');
      const [msg, ctx] = call;
      expect(String(msg)).toContain('Error in explicitCodeTest:');
      expect(ctx).toMatchObject({
        requestId: 'rid-1',
        operation: 'explicitCodeTest',
        critical: true,
        errorCode: JsonRpcErrorCode.ServiceUnavailable,
      });
      // stack should be omitted in logContext
      expect((ctx as Record<string, unknown>).stack).toBeUndefined();
    });

    it('preserves original McpError data and does not duplicate originalStack when already present', () => {
      const original = new McpError(JsonRpcErrorCode.InternalError, 'oops', {
        originalStack: 'ORIG_STACK',
        foo: 'bar',
      });
      const final = ErrorHandler.handleError(original, {
        operation: 'mcpDataTest',
        context: { requestId: 'rid-2' },
      });

      expect(final).toBeInstanceOf(McpError);
      expect((final as McpError).code).toBe(JsonRpcErrorCode.InternalError);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const call = errorSpy.mock.calls[0];
      if (!call) throw new Error('errorSpy was not called');
      const [, ctx] = call;
      const data = (ctx as Record<string, any>).errorData;
      expect(data).toMatchObject({
        originalErrorName: 'McpError',
        originalMessage: 'oops',
        foo: 'bar',
        originalStack: 'ORIG_STACK', // carried through, not duplicated
      });
    });
  });
});
