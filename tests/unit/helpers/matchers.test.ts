/**
 * @fileoverview Verifies the custom Vitest matchers registered in tests/setup.ts.
 * Ensures the matchers pass for valid assertions and produce readable failures
 * when assertions fail.
 * @module tests/unit/helpers/matchers.test
 */
import { describe, expect, it } from 'vitest';
import { JsonRpcErrorCode, McpError, notFound, validationError } from '@/types-global/errors.js';

describe('toBeMcpError', () => {
  it('passes for an McpError instance', () => {
    const err = new McpError(JsonRpcErrorCode.NotFound, 'gone');
    expect(err).toBeMcpError();
  });

  it('passes when the code matches', () => {
    expect(notFound('item missing')).toBeMcpError(JsonRpcErrorCode.NotFound);
    expect(validationError('bad input')).toBeMcpError(JsonRpcErrorCode.ValidationError);
  });

  it('fails for a plain Error', () => {
    expect(() => expect(new Error('boom')).toBeMcpError()).toThrow(/toBeMcpError/);
  });

  it('fails for null/undefined', () => {
    expect(() => expect(null).toBeMcpError()).toThrow();
    expect(() => expect(undefined).toBeMcpError()).toThrow();
  });

  it('fails when the code does not match', () => {
    const err = new McpError(JsonRpcErrorCode.NotFound, 'gone');
    expect(() => expect(err).toBeMcpError(JsonRpcErrorCode.Forbidden)).toThrow(/NotFound/);
  });

  it('supports negation', () => {
    expect(new Error('boom')).not.toBeMcpError();
    const err = new McpError(JsonRpcErrorCode.NotFound, 'gone');
    expect(err).not.toBeMcpError(JsonRpcErrorCode.Forbidden);
  });

  it('works with rejects.toBeMcpError for async throws', async () => {
    const fn = async () => {
      throw notFound('async missing', { kind: 'item' });
    };
    await expect(fn()).rejects.toBeMcpError(JsonRpcErrorCode.NotFound);
  });
});

describe('toHaveJsonRpcCode', () => {
  it('passes for McpError with matching code', () => {
    expect(validationError('x')).toHaveJsonRpcCode(JsonRpcErrorCode.ValidationError);
  });

  it('passes for plain objects shaped like JSON-RPC errors', () => {
    expect({ code: JsonRpcErrorCode.Unauthorized, message: 'denied' }).toHaveJsonRpcCode(
      JsonRpcErrorCode.Unauthorized,
    );
  });

  it('fails when code does not match', () => {
    expect(() =>
      expect({ code: JsonRpcErrorCode.Forbidden }).toHaveJsonRpcCode(JsonRpcErrorCode.NotFound),
    ).toThrow(/NotFound/);
  });

  it('fails for values without a code field', () => {
    expect(() => expect({ status: 404 }).toHaveJsonRpcCode(JsonRpcErrorCode.NotFound)).toThrow();
    expect(() => expect(null).toHaveJsonRpcCode(JsonRpcErrorCode.NotFound)).toThrow();
  });
});
