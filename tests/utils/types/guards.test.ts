/**
 * @fileoverview Tests for type guard utilities
 * @module tests/utils/types/guards
 */

import { describe, expect, it } from 'vitest';
import {
  getNumberProperty,
  getProperty,
  getStringProperty,
  hasProperty,
  hasPropertyOfType,
  isAggregateError,
  isErrorWithCode,
  isErrorWithStatus,
  isNumber,
  isObject,
  isRecord,
  isString,
} from '@/utils/types/guards.js';

describe('Type Guards', () => {
  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
      expect(isObject(new Date())).toBe(true);
    });

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isObject([])).toBe(false);
      expect(isObject([1, 2, 3])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject(Symbol('test'))).toBe(false);
    });

    it('should return false for functions', () => {
      expect(isObject(() => {})).toBe(false);
      expect(isObject(function test() {})).toBe(false);
    });
  });

  describe('isRecord', () => {
    it('should return true for plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'value' })).toBe(true);
      expect(isRecord({ a: 1, b: 2, c: 3 })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isRecord(null)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isRecord([])).toBe(false);
      expect(isRecord([1, 2, 3])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isRecord('string')).toBe(false);
      expect(isRecord(123)).toBe(false);
      expect(isRecord(true)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
    });

    it('should handle objects with various value types', () => {
      expect(isRecord({ str: 'hello', num: 42, bool: true })).toBe(true);
      expect(isRecord({ nested: { obj: 'value' } })).toBe(true);
    });
  });

  describe('hasProperty', () => {
    it('should return true when property exists', () => {
      const obj = { name: 'test', count: 42 };
      expect(hasProperty(obj, 'name')).toBe(true);
      expect(hasProperty(obj, 'count')).toBe(true);
    });

    it('should return false when property does not exist', () => {
      const obj = { name: 'test' };
      expect(hasProperty(obj, 'missing')).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(hasProperty(null, 'prop')).toBe(false);
      expect(hasProperty(undefined, 'prop')).toBe(false);
      expect(hasProperty('string', 'prop')).toBe(false);
      expect(hasProperty(123, 'prop')).toBe(false);
    });

    it('should work with symbols as keys', () => {
      const sym = Symbol('test');
      const obj = { [sym]: 'value' };
      expect(hasProperty(obj, sym)).toBe(true);
    });

    it('should work with numeric keys', () => {
      const obj = { 0: 'zero', 1: 'one' };
      expect(hasProperty(obj, 0)).toBe(true);
      expect(hasProperty(obj, 1)).toBe(true);
    });

    it('should handle undefined property values', () => {
      const obj = { prop: undefined };
      expect(hasProperty(obj, 'prop')).toBe(true);
    });
  });

  describe('hasPropertyOfType', () => {
    it('should return true when property exists and matches type', () => {
      const obj = { name: 'test', count: 42 };
      expect(hasPropertyOfType(obj, 'name', isString)).toBe(true);
      expect(hasPropertyOfType(obj, 'count', isNumber)).toBe(true);
    });

    it('should return false when property exists but type does not match', () => {
      const obj = { name: 'test', count: 42 };
      expect(hasPropertyOfType(obj, 'name', isNumber)).toBe(false);
      expect(hasPropertyOfType(obj, 'count', isString)).toBe(false);
    });

    it('should return false when property does not exist', () => {
      const obj = { name: 'test' };
      expect(hasPropertyOfType(obj, 'missing', isString)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(hasPropertyOfType(null, 'prop', isString)).toBe(false);
      expect(hasPropertyOfType(undefined, 'prop', isString)).toBe(false);
    });

    it('should work with custom type guards', () => {
      const isPositive = (v: unknown): v is number =>
        typeof v === 'number' && v > 0;
      const obj = { positive: 42, negative: -1 };
      expect(hasPropertyOfType(obj, 'positive', isPositive)).toBe(true);
      expect(hasPropertyOfType(obj, 'negative', isPositive)).toBe(false);
    });
  });

  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString('123')).toBe(true);
      expect(isString(String('test'))).toBe(true);
    });

    it('should return false for non-strings', () => {
      expect(isString(123)).toBe(false);
      expect(isString(true)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
      expect(isString(Symbol('test'))).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('should return true for numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(42)).toBe(true);
      expect(isNumber(-1)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(Infinity)).toBe(true);
      expect(isNumber(-Infinity)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isNumber(Number.NaN)).toBe(false);
      expect(isNumber(0 / 0)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isNumber('123')).toBe(false);
      expect(isNumber(true)).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber({})).toBe(false);
      expect(isNumber([])).toBe(false);
    });
  });

  describe('isAggregateError', () => {
    it('should return true for AggregateError', () => {
      const err = new AggregateError([new Error('1'), new Error('2')], 'Test');
      expect(isAggregateError(err)).toBe(true);
    });

    it('should return true for Error with errors array property', () => {
      const err = new Error('Test');
      (err as any).errors = [new Error('1'), new Error('2')];
      expect(isAggregateError(err)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const err = new Error('Test');
      expect(isAggregateError(err)).toBe(false);
    });

    it('should return false when errors property is not an array', () => {
      const err = new Error('Test');
      (err as any).errors = 'not an array';
      expect(isAggregateError(err)).toBe(false);
    });

    it('should return false for non-Error objects', () => {
      expect(isAggregateError({ errors: [] })).toBe(false);
      expect(isAggregateError(null)).toBe(false);
      expect(isAggregateError(undefined)).toBe(false);
      expect(isAggregateError('error')).toBe(false);
    });

    it('should handle empty errors array', () => {
      const err = new Error('Test');
      (err as any).errors = [];
      expect(isAggregateError(err)).toBe(true);
    });
  });

  describe('isErrorWithCode', () => {
    it('should return true for Error with code property', () => {
      const err = new Error('Test');
      (err as any).code = 'ERR_TEST';
      expect(isErrorWithCode(err)).toBe(true);
    });

    it('should return true for Error with numeric code', () => {
      const err = new Error('Test');
      (err as any).code = 404;
      expect(isErrorWithCode(err)).toBe(true);
    });

    it('should return false for regular Error without code', () => {
      const err = new Error('Test');
      expect(isErrorWithCode(err)).toBe(false);
    });

    it('should return false for non-Error objects with code', () => {
      expect(isErrorWithCode({ code: 'ERR_TEST' })).toBe(false);
      expect(isErrorWithCode(null)).toBe(false);
      expect(isErrorWithCode(undefined)).toBe(false);
    });
  });

  describe('isErrorWithStatus', () => {
    it('should return true for Error with status property', () => {
      const err = new Error('Test');
      (err as any).status = 404;
      expect(isErrorWithStatus(err)).toBe(true);
    });

    it('should return true for Error with string status', () => {
      const err = new Error('Test');
      (err as any).status = 'NOT_FOUND';
      expect(isErrorWithStatus(err)).toBe(true);
    });

    it('should return false for regular Error without status', () => {
      const err = new Error('Test');
      expect(isErrorWithStatus(err)).toBe(false);
    });

    it('should return false for non-Error objects with status', () => {
      expect(isErrorWithStatus({ status: 404 })).toBe(false);
      expect(isErrorWithStatus(null)).toBe(false);
      expect(isErrorWithStatus(undefined)).toBe(false);
    });
  });

  describe('getProperty', () => {
    it('should return property value when it exists', () => {
      const obj = { name: 'test', count: 42 };
      expect(getProperty(obj, 'name')).toBe('test');
      expect(getProperty(obj, 'count')).toBe(42);
    });

    it('should return undefined when property does not exist', () => {
      const obj = { name: 'test' };
      expect(getProperty(obj, 'missing')).toBeUndefined();
    });

    it('should return undefined for non-objects', () => {
      expect(getProperty(null, 'prop')).toBeUndefined();
      expect(getProperty(undefined, 'prop')).toBeUndefined();
      expect(getProperty('string', 'prop')).toBeUndefined();
      expect(getProperty(123, 'prop')).toBeUndefined();
    });

    it('should handle undefined property values', () => {
      const obj = { prop: undefined };
      expect(getProperty(obj, 'prop')).toBeUndefined();
    });

    it('should handle null property values', () => {
      const obj = { prop: null };
      expect(getProperty(obj, 'prop')).toBeNull();
    });

    it('should work with symbols as keys', () => {
      const sym = Symbol('test');
      const obj = { [sym]: 'value' };
      expect(getProperty(obj, sym)).toBe('value');
    });
  });

  describe('getStringProperty', () => {
    it('should return string value when property exists and is string', () => {
      const obj = { name: 'test', other: 'value' };
      expect(getStringProperty(obj, 'name')).toBe('test');
      expect(getStringProperty(obj, 'other')).toBe('value');
    });

    it('should return undefined when property is not a string', () => {
      const obj = { count: 42, flag: true, data: { nested: 'value' } };
      expect(getStringProperty(obj, 'count')).toBeUndefined();
      expect(getStringProperty(obj, 'flag')).toBeUndefined();
      expect(getStringProperty(obj, 'data')).toBeUndefined();
    });

    it('should return undefined when property does not exist', () => {
      const obj = { name: 'test' };
      expect(getStringProperty(obj, 'missing')).toBeUndefined();
    });

    it('should return undefined for non-objects', () => {
      expect(getStringProperty(null, 'prop')).toBeUndefined();
      expect(getStringProperty(undefined, 'prop')).toBeUndefined();
      expect(getStringProperty(123, 'prop')).toBeUndefined();
    });

    it('should handle empty strings', () => {
      const obj = { empty: '' };
      expect(getStringProperty(obj, 'empty')).toBe('');
    });
  });

  describe('getNumberProperty', () => {
    it('should return number value when property exists and is number', () => {
      const obj = { count: 42, value: 3.14, zero: 0 };
      expect(getNumberProperty(obj, 'count')).toBe(42);
      expect(getNumberProperty(obj, 'value')).toBe(3.14);
      expect(getNumberProperty(obj, 'zero')).toBe(0);
    });

    it('should return undefined for NaN values', () => {
      const obj = { invalid: Number.NaN };
      expect(getNumberProperty(obj, 'invalid')).toBeUndefined();
    });

    it('should handle Infinity values', () => {
      const obj = { inf: Infinity, negInf: -Infinity };
      expect(getNumberProperty(obj, 'inf')).toBe(Infinity);
      expect(getNumberProperty(obj, 'negInf')).toBe(-Infinity);
    });

    it('should return undefined when property is not a number', () => {
      const obj = { name: 'test', flag: true, data: { nested: 'value' } };
      expect(getNumberProperty(obj, 'name')).toBeUndefined();
      expect(getNumberProperty(obj, 'flag')).toBeUndefined();
      expect(getNumberProperty(obj, 'data')).toBeUndefined();
    });

    it('should return undefined when property does not exist', () => {
      const obj = { count: 42 };
      expect(getNumberProperty(obj, 'missing')).toBeUndefined();
    });

    it('should return undefined for non-objects', () => {
      expect(getNumberProperty(null, 'prop')).toBeUndefined();
      expect(getNumberProperty(undefined, 'prop')).toBeUndefined();
      expect(getNumberProperty('string', 'prop')).toBeUndefined();
    });
  });
});
