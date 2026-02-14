/**
 * @fileoverview Test suite for error handler helper utilities — getErrorName, getErrorMessage,
 * createSafeRegex, extractErrorCauseChain, serializeErrorCauseChain.
 * @module tests/utils/internal/error-handler/helpers.test
 */

import { describe, it, expect } from 'vitest';
import {
  getErrorName,
  getErrorMessage,
  createSafeRegex,
  extractErrorCauseChain,
  serializeErrorCauseChain,
} from '@/utils/internal/error-handler/helpers.js';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';

describe('Error Handler Helpers', () => {
  // ─── getErrorName ────────────────────────────────────────────────────────────

  describe('getErrorName', () => {
    it('should return name from Error instance', () => {
      expect(getErrorName(new Error('test'))).toBe('Error');
    });

    it('should return name from TypeError', () => {
      expect(getErrorName(new TypeError('bad'))).toBe('TypeError');
    });

    it('should return name from custom Error subclass', () => {
      class CustomError extends Error {
        override name = 'CustomError';
      }
      expect(getErrorName(new CustomError('custom'))).toBe('CustomError');
    });

    it('should return NullValueEncountered for null', () => {
      expect(getErrorName(null)).toBe('NullValueEncountered');
    });

    it('should return UndefinedValueEncountered for undefined', () => {
      expect(getErrorName(undefined)).toBe('UndefinedValueEncountered');
    });

    it('should return constructor name for custom class instances', () => {
      class MyClass {}
      expect(getErrorName(new MyClass())).toBe('MyClassEncountered');
    });

    it('should return typeof for plain object', () => {
      expect(getErrorName({})).toBe('objectEncountered');
    });

    it('should return typeof for string value', () => {
      expect(getErrorName('hello')).toBe('stringEncountered');
    });

    it('should return typeof for number value', () => {
      expect(getErrorName(42)).toBe('numberEncountered');
    });

    it('should return typeof for boolean value', () => {
      expect(getErrorName(true)).toBe('booleanEncountered');
    });
  });

  // ─── getErrorMessage ─────────────────────────────────────────────────────────

  describe('getErrorMessage', () => {
    it('should return message from Error instance', () => {
      expect(getErrorMessage(new Error('test message'))).toBe('test message');
    });

    it('should combine AggregateError messages', () => {
      const agg = new AggregateError(
        [new Error('first'), new Error('second'), new Error('third')],
        'aggregate',
      );
      const msg = getErrorMessage(agg);
      expect(msg).toContain('aggregate');
      expect(msg).toContain('first');
      expect(msg).toContain('second');
      expect(msg).toContain('third');
    });

    it('should slice AggregateError inner messages to 3', () => {
      const errors = Array.from({ length: 5 }, (_, i) => new Error(`err${i}`));
      const agg = new AggregateError(errors, 'many');
      const msg = getErrorMessage(agg);
      expect(msg).toContain('err0');
      expect(msg).toContain('err2');
      expect(msg).not.toContain('err3');
    });

    it('should return special message for null', () => {
      expect(getErrorMessage(null)).toBe('Null value encountered as error');
    });

    it('should return special message for undefined', () => {
      expect(getErrorMessage(undefined)).toBe(
        'Undefined value encountered as error',
      );
    });

    it('should return string value directly', () => {
      expect(getErrorMessage('direct string')).toBe('direct string');
    });

    it('should stringify number', () => {
      expect(getErrorMessage(42)).toBe('42');
    });

    it('should stringify boolean', () => {
      expect(getErrorMessage(false)).toBe('false');
    });

    it('should stringify bigint', () => {
      expect(getErrorMessage(BigInt(123))).toBe('123');
    });

    it('should format function name', () => {
      function myFn() {}
      expect(getErrorMessage(myFn)).toBe('[function myFn]');
    });

    it('should format anonymous function', () => {
      expect(getErrorMessage(() => {})).toContain('[function');
    });

    it('should format symbol', () => {
      expect(getErrorMessage(Symbol('test'))).toBe('Symbol(test)');
    });

    it('should JSON.stringify plain object', () => {
      expect(getErrorMessage({ code: 500 })).toBe('{"code":500}');
    });

    it('should handle object that fails JSON.stringify', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      const msg = getErrorMessage(circular);
      expect(msg).toContain('Non-Error object');
    });

    it('should handle empty object', () => {
      const msg = getErrorMessage({});
      expect(msg).toContain('Non-Error object');
    });
  });

  // ─── createSafeRegex ────────────────────────────────────────────────────────

  describe('createSafeRegex', () => {
    it('should compile string to case-insensitive RegExp', () => {
      const regex = createSafeRegex('hello');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.flags).toContain('i');
      expect(regex.test('HELLO')).toBe(true);
    });

    it('should strip global flag from RegExp input', () => {
      const regex = createSafeRegex(/test/gi);
      expect(regex.flags).not.toContain('g');
      expect(regex.flags).toContain('i');
    });

    it('should add case-insensitive flag if missing', () => {
      const regex = createSafeRegex(/test/);
      expect(regex.flags).toContain('i');
    });

    it('should return cached instance for same input', () => {
      const a = createSafeRegex('cached-test-helpers');
      const b = createSafeRegex('cached-test-helpers');
      expect(a).toBe(b);
    });
  });

  // ─── extractErrorCauseChain ──────────────────────────────────────────────────

  describe('extractErrorCauseChain', () => {
    it('should extract single error with no cause', () => {
      const chain = extractErrorCauseChain(new Error('root'));
      expect(chain).toHaveLength(1);
      expect(chain[0]!.message).toBe('root');
      expect(chain[0]!.depth).toBe(0);
    });

    it('should extract chained errors', () => {
      const root = new Error('root cause');
      const middle = new Error('middle', { cause: root });
      const top = new Error('top', { cause: middle });
      const chain = extractErrorCauseChain(top);
      expect(chain).toHaveLength(3);
      expect(chain[0]!.message).toBe('top');
      expect(chain[1]!.message).toBe('middle');
      expect(chain[2]!.message).toBe('root cause');
    });

    it('should detect circular references', () => {
      const err1 = new Error('err1');
      const err2 = new Error('err2', { cause: err1 });
      // Force circular reference
      Object.defineProperty(err1, 'cause', { value: err2 });
      const chain = extractErrorCauseChain(err2);
      const lastNode = chain[chain.length - 1]!;
      expect(lastNode.name).toBe('CircularReference');
    });

    it('should respect maxDepth limit', () => {
      let current: Error = new Error('deep-0');
      for (let i = 1; i <= 5; i++) {
        current = new Error(`deep-${i}`, { cause: current });
      }
      const chain = extractErrorCauseChain(current, 3);
      const lastNode = chain[chain.length - 1]!;
      expect(lastNode.name).toBe('MaxDepthExceeded');
    });

    it('should include McpError data', () => {
      const err = new McpError(JsonRpcErrorCode.NotFound, 'gone', {
        resource: 'user',
      });
      const chain = extractErrorCauseChain(err);
      expect(chain[0]!.data).toEqual({ resource: 'user' });
    });

    it('should handle string cause', () => {
      const err = new Error('top');
      Object.defineProperty(err, 'cause', { value: 'string cause' });
      const chain = extractErrorCauseChain(err);
      expect(chain).toHaveLength(2);
      expect(chain[1]!.name).toBe('StringError');
      expect(chain[1]!.message).toBe('string cause');
    });

    it('should handle non-Error non-string cause', () => {
      const err = new Error('top');
      Object.defineProperty(err, 'cause', { value: { code: 500 } });
      const chain = extractErrorCauseChain(err);
      expect(chain).toHaveLength(2);
      expect(chain[1]!.depth).toBe(1);
    });

    it('should return empty chain for falsy input', () => {
      expect(extractErrorCauseChain(null)).toHaveLength(0);
      expect(extractErrorCauseChain(undefined)).toHaveLength(0);
    });
  });

  // ─── serializeErrorCauseChain ────────────────────────────────────────────────

  describe('serializeErrorCauseChain', () => {
    it('should return rootCause, chain, and totalDepth', () => {
      const err = new Error('top', { cause: new Error('root') });
      const result = serializeErrorCauseChain(err);
      expect(result.chain).toHaveLength(2);
      expect(result.totalDepth).toBe(2);
      expect(result.rootCause.message).toBe('root');
    });

    it('should handle single error', () => {
      const result = serializeErrorCauseChain(new Error('only'));
      expect(result.totalDepth).toBe(1);
      expect(result.rootCause.message).toBe('only');
    });

    it('should handle empty chain gracefully', () => {
      const result = serializeErrorCauseChain(null);
      expect(result.totalDepth).toBe(0);
      expect(result.rootCause.name).toBe('Unknown');
    });
  });
});
