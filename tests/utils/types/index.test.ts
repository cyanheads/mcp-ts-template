/**
 * @fileoverview Tests for the types module barrel exports.
 * @module tests/utils/types
 */
import { describe, it, expect } from 'vitest';
import * as guards from '@/utils/types/guards.js';
import * as typesModule from '@/utils/types/index.js';

describe('Types Module Exports', () => {
  it('should export all type guard functions', () => {
    // Verify all exports from guards are re-exported
    expect(typesModule.isObject).toBeDefined();
    expect(typesModule.isRecord).toBeDefined();
    expect(typesModule.hasProperty).toBeDefined();
    expect(typesModule.hasPropertyOfType).toBeDefined();
    expect(typesModule.isString).toBeDefined();
    expect(typesModule.isNumber).toBeDefined();
    expect(typesModule.isBoolean).toBeDefined();
    expect(typesModule.isBigInt).toBeDefined();
    expect(typesModule.isFunction).toBeDefined();
    expect(typesModule.isArray).toBeDefined();
    expect(typesModule.isDefined).toBeDefined();
    expect(typesModule.isNull).toBeDefined();
    expect(typesModule.isUndefined).toBeDefined();
    expect(typesModule.isDate).toBeDefined();
    expect(typesModule.isRegExp).toBeDefined();
    expect(typesModule.isPromise).toBeDefined();
    expect(typesModule.isAggregateError).toBeDefined();
    expect(typesModule.isErrorWithCode).toBeDefined();
    expect(typesModule.isErrorWithStatus).toBeDefined();
    expect(typesModule.getProperty).toBeDefined();
    expect(typesModule.getStringProperty).toBeDefined();
    expect(typesModule.getNumberProperty).toBeDefined();
    expect(typesModule.getBooleanProperty).toBeDefined();
    expect(typesModule.getArrayProperty).toBeDefined();
  });

  it('should re-export the same functions from guards module', () => {
    expect(typesModule.isObject).toBe(guards.isObject);
    expect(typesModule.isString).toBe(guards.isString);
    expect(typesModule.isNumber).toBe(guards.isNumber);
    expect(typesModule.hasProperty).toBe(guards.hasProperty);
  });
});
