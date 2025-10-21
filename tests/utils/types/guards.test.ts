/**
 * @fileoverview Tests for type guard utilities.
 * @module tests/utils/types/guards
 */
import { describe, it, expect } from 'vitest';
import {
  isObject,
  isRecord,
  hasProperty,
  hasPropertyOfType,
  isString,
  isNumber,
  isBoolean,
  isBigInt,
  isFunction,
  isArray,
  isDefined,
  isNull,
  isUndefined,
  isDate,
  isRegExp,
  isPromise,
  isAggregateError,
  isErrorWithCode,
  isErrorWithStatus,
  getProperty,
  getStringProperty,
  getNumberProperty,
  getBooleanProperty,
  getArrayProperty,
} from '@/utils/types/guards.js';

describe('Type Guards', () => {
  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
      expect(isObject(Object.create(null))).toBe(true);
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
    });

    it('should return true for class instances', () => {
      class TestClass {}
      expect(isObject(new TestClass())).toBe(true);
      expect(isObject(new Date())).toBe(true);
      expect(isObject(new Error())).toBe(true);
    });
  });

  describe('isRecord', () => {
    it('should return true for objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'value' })).toBe(true);
    });

    it('should return false for non-objects', () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord([])).toBe(false);
      expect(isRecord('string')).toBe(false);
    });
  });

  describe('hasProperty', () => {
    it('should return true when property exists', () => {
      const obj = { name: 'test', age: 25 };
      expect(hasProperty(obj, 'name')).toBe(true);
      expect(hasProperty(obj, 'age')).toBe(true);
    });

    it('should return false when property does not exist', () => {
      const obj = { name: 'test' };
      expect(hasProperty(obj, 'missing')).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(hasProperty(null, 'prop')).toBe(false);
      expect(hasProperty(undefined, 'prop')).toBe(false);
      expect(hasProperty('string', 'prop')).toBe(false);
    });

    it('should work with symbol keys', () => {
      const sym = Symbol('test');
      const obj = { [sym]: 'value' };
      expect(hasProperty(obj, sym)).toBe(true);
    });
  });

  describe('hasPropertyOfType', () => {
    it('should return true when property exists with correct type', () => {
      const obj = { count: 42, name: 'test' };
      expect(hasPropertyOfType(obj, 'count', isNumber)).toBe(true);
      expect(hasPropertyOfType(obj, 'name', isString)).toBe(true);
    });

    it('should return false when property exists but wrong type', () => {
      const obj = { count: '42' };
      expect(hasPropertyOfType(obj, 'count', isNumber)).toBe(false);
    });

    it('should return false when property does not exist', () => {
      const obj = {};
      expect(hasPropertyOfType(obj, 'missing', isString)).toBe(false);
    });
  });

  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('')).toBe(true);
      expect(isString('hello')).toBe(true);
      expect(isString(String('test'))).toBe(true);
    });

    it('should return false for non-strings', () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('should return true for numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(123)).toBe(true);
      expect(isNumber(-456)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(Infinity)).toBe(true);
      expect(isNumber(-Infinity)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isNumber(Number.NaN)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isNumber('123')).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
    });
  });

  describe('isBoolean', () => {
    it('should return true for booleans', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(Boolean(1))).toBe(true);
    });

    it('should return false for non-booleans', () => {
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean('true')).toBe(false);
      expect(isBoolean(null)).toBe(false);
      expect(isBoolean(undefined)).toBe(false);
    });
  });

  describe('isBigInt', () => {
    it('should return true for bigints', () => {
      expect(isBigInt(0n)).toBe(true);
      expect(isBigInt(123n)).toBe(true);
      expect(isBigInt(BigInt(456))).toBe(true);
    });

    it('should return false for non-bigints', () => {
      expect(isBigInt(123)).toBe(false);
      expect(isBigInt('123n')).toBe(false);
      expect(isBigInt(null)).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('should return true for functions', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function () {})).toBe(true);
      expect(isFunction(async () => {})).toBe(true);
      expect(isFunction(class {})).toBe(true);
    });

    it('should return false for non-functions', () => {
      expect(isFunction({})).toBe(false);
      expect(isFunction(null)).toBe(false);
      expect(isFunction('function')).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray(new Array())).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(isArray({})).toBe(false);
      expect(isArray(null)).toBe(false);
      expect(isArray('array')).toBe(false);
      expect(isArray({ length: 0 })).toBe(false);
    });

    it('should work with generic type parameter', () => {
      const value: unknown = [1, 2, 3];
      if (isArray<number>(value)) {
        // Type is now number[]
        expect(value[0]).toBe(1);
      }
    });
  });

  describe('isDefined', () => {
    it('should return true for defined values', () => {
      expect(isDefined(0)).toBe(true);
      expect(isDefined('')).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined({})).toBe(true);
      expect(isDefined([])).toBe(true);
    });

    it('should return false for null', () => {
      expect(isDefined(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isDefined(undefined)).toBe(false);
    });
  });

  describe('isNull', () => {
    it('should return true for null', () => {
      expect(isNull(null)).toBe(true);
    });

    it('should return false for non-null values', () => {
      expect(isNull(undefined)).toBe(false);
      expect(isNull(0)).toBe(false);
      expect(isNull('')).toBe(false);
      expect(isNull(false)).toBe(false);
      expect(isNull({})).toBe(false);
    });
  });

  describe('isUndefined', () => {
    it('should return true for undefined', () => {
      expect(isUndefined(undefined)).toBe(true);
      let x;
      expect(isUndefined(x)).toBe(true);
    });

    it('should return false for non-undefined values', () => {
      expect(isUndefined(null)).toBe(false);
      expect(isUndefined(0)).toBe(false);
      expect(isUndefined('')).toBe(false);
      expect(isUndefined(false)).toBe(false);
    });
  });

  describe('isDate', () => {
    it('should return true for valid Date objects', () => {
      expect(isDate(new Date())).toBe(true);
      expect(isDate(new Date('2024-01-01'))).toBe(true);
      expect(isDate(new Date(0))).toBe(true);
    });

    it('should return false for invalid Date objects', () => {
      expect(isDate(new Date('invalid'))).toBe(false);
    });

    it('should return false for non-Date values', () => {
      expect(isDate('2024-01-01')).toBe(false);
      expect(isDate(1234567890)).toBe(false);
      expect(isDate(null)).toBe(false);
    });
  });

  describe('isRegExp', () => {
    it('should return true for RegExp objects', () => {
      expect(isRegExp(/test/)).toBe(true);
      expect(isRegExp(new RegExp('test'))).toBe(true);
      expect(isRegExp(/^[a-z]+$/i)).toBe(true);
    });

    it('should return false for non-RegExp values', () => {
      expect(isRegExp('/test/')).toBe(false);
      expect(isRegExp(null)).toBe(false);
      expect(isRegExp({})).toBe(false);
    });
  });

  describe('isPromise', () => {
    it('should return true for Promise objects', () => {
      expect(isPromise(Promise.resolve())).toBe(true);
      expect(isPromise(Promise.reject().catch(() => {}))).toBe(true);
      expect(isPromise(new Promise(() => {}))).toBe(true);
    });

    it('should return false for non-Promise values', () => {
      expect(isPromise({ then: () => {} })).toBe(false);
      expect(isPromise(null)).toBe(false);
      expect(isPromise(async () => {})).toBe(false);
    });
  });

  describe('isAggregateError', () => {
    it('should return true for AggregateError', () => {
      const error = new AggregateError([new Error('1'), new Error('2')]);
      expect(isAggregateError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isAggregateError(new Error('test'))).toBe(false);
    });

    it('should return false for objects with errors property that is not an array', () => {
      const fakeError = new Error('test');
      (fakeError as any).errors = 'not an array';
      expect(isAggregateError(fakeError)).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isAggregateError({ errors: [] })).toBe(false);
      expect(isAggregateError(null)).toBe(false);
    });
  });

  describe('isErrorWithCode', () => {
    it('should return true for errors with code property', () => {
      const error = new Error('test');
      (error as any).code = 'ERR_TEST';
      expect(isErrorWithCode(error)).toBe(true);
    });

    it('should return false for errors without code property', () => {
      expect(isErrorWithCode(new Error('test'))).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isErrorWithCode({ code: 'ERR_TEST' })).toBe(false);
      expect(isErrorWithCode(null)).toBe(false);
    });
  });

  describe('isErrorWithStatus', () => {
    it('should return true for errors with status property', () => {
      const error = new Error('test');
      (error as any).status = 404;
      expect(isErrorWithStatus(error)).toBe(true);
    });

    it('should return false for errors without status property', () => {
      expect(isErrorWithStatus(new Error('test'))).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isErrorWithStatus({ status: 404 })).toBe(false);
      expect(isErrorWithStatus(null)).toBe(false);
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
      expect(getProperty('string', 'prop')).toBeUndefined();
    });
  });

  describe('getStringProperty', () => {
    it('should return string value when property is a string', () => {
      const obj = { name: 'test', other: 123 };
      expect(getStringProperty(obj, 'name')).toBe('test');
    });

    it('should return undefined when property is not a string', () => {
      const obj = { count: 123 };
      expect(getStringProperty(obj, 'count')).toBeUndefined();
    });

    it('should return undefined when property does not exist', () => {
      const obj = {};
      expect(getStringProperty(obj, 'missing')).toBeUndefined();
    });
  });

  describe('getNumberProperty', () => {
    it('should return number value when property is a number', () => {
      const obj = { count: 42, name: 'test' };
      expect(getNumberProperty(obj, 'count')).toBe(42);
    });

    it('should return undefined when property is not a number', () => {
      const obj = { name: 'test' };
      expect(getNumberProperty(obj, 'name')).toBeUndefined();
    });

    it('should return undefined when property does not exist', () => {
      const obj = {};
      expect(getNumberProperty(obj, 'missing')).toBeUndefined();
    });

    it('should return undefined for NaN values', () => {
      const obj = { value: Number.NaN };
      expect(getNumberProperty(obj, 'value')).toBeUndefined();
    });
  });

  describe('getBooleanProperty', () => {
    it('should return boolean value when property is a boolean', () => {
      const obj = { active: true, disabled: false };
      expect(getBooleanProperty(obj, 'active')).toBe(true);
      expect(getBooleanProperty(obj, 'disabled')).toBe(false);
    });

    it('should return undefined when property is not a boolean', () => {
      const obj = { active: 1 };
      expect(getBooleanProperty(obj, 'active')).toBeUndefined();
    });

    it('should return undefined when property does not exist', () => {
      const obj = {};
      expect(getBooleanProperty(obj, 'missing')).toBeUndefined();
    });
  });

  describe('getArrayProperty', () => {
    it('should return array value when property is an array', () => {
      const obj = { items: [1, 2, 3], other: 'test' };
      expect(getArrayProperty(obj, 'items')).toEqual([1, 2, 3]);
    });

    it('should return undefined when property is not an array', () => {
      const obj = { items: 'not an array' };
      expect(getArrayProperty(obj, 'items')).toBeUndefined();
    });

    it('should return undefined when property does not exist', () => {
      const obj = {};
      expect(getArrayProperty(obj, 'missing')).toBeUndefined();
    });

    it('should work with typed arrays', () => {
      const obj = { numbers: [1, 2, 3] };
      const result = getArrayProperty<'numbers', number>(obj, 'numbers');
      if (result) {
        expect(result[0]).toBe(1);
      }
    });
  });
});
