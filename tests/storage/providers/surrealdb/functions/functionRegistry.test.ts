/**
 * @fileoverview Tests for SurrealDB function registry
 * @module tests/storage/providers/surrealdb/functions/functionRegistry
 */

import { describe, expect, it } from 'vitest';
import { FunctionRegistry } from '@/storage/providers/surrealdb/functions/functionRegistry.js';

describe('FunctionRegistry', () => {
  describe('validateEmail', () => {
    it('should return validate_email function config', () => {
      const func = FunctionRegistry.validateEmail();

      expect(func.name).toBe('validate_email');
      expect(func.parameters).toHaveLength(1);
      expect(func.parameters[0]!.name).toBe('email');
      expect(func.parameters[0]!.type).toBe('string');
      expect(func.returnType).toBe('bool');
      expect(func.body).toContain('string::is::email');
      expect(func.comment).toBeDefined();
    });
  });

  describe('calculatePercentage', () => {
    it('should return calculate_percentage function config', () => {
      const func = FunctionRegistry.calculatePercentage();

      expect(func.name).toBe('calculate_percentage');
      expect(func.parameters).toHaveLength(2);
      expect(func.parameters[0]!.name).toBe('value');
      expect(func.parameters[0]!.type).toBe('decimal');
      expect(func.parameters[1]!.name).toBe('total');
      expect(func.parameters[1]!.type).toBe('decimal');
      expect(func.returnType).toBe('decimal');
      expect(func.body).toContain('$total = 0');
      expect(func.body).toContain('($value / $total) * 100');
    });
  });

  describe('generateSlug', () => {
    it('should return generate_slug function config', () => {
      const func = FunctionRegistry.generateSlug();

      expect(func.name).toBe('generate_slug');
      expect(func.parameters).toHaveLength(1);
      expect(func.parameters[0]!.name).toBe('text');
      expect(func.returnType).toBe('string');
      expect(func.body).toContain('string::lowercase');
      expect(func.body).toContain('string::trim');
      expect(func.body).toContain("string::replace($trimmed, ' ', '-')");
    });
  });

  describe('haversineDistance', () => {
    it('should return haversine_distance function config', () => {
      const func = FunctionRegistry.haversineDistance();

      expect(func.name).toBe('haversine_distance');
      expect(func.parameters).toHaveLength(4);
      expect(func.parameters[0]!.name).toBe('lat1');
      expect(func.parameters[1]!.name).toBe('lon1');
      expect(func.parameters[2]!.name).toBe('lat2');
      expect(func.parameters[3]!.name).toBe('lon2');
      expect(func.returnType).toBe('float');
      expect(func.body).toContain('6371'); // Earth radius
      expect(func.body).toContain('math::deg2rad');
    });
  });

  describe('arrayUnique', () => {
    it('should return array_unique function config', () => {
      const func = FunctionRegistry.arrayUnique();

      expect(func.name).toBe('array_unique');
      expect(func.parameters).toHaveLength(1);
      expect(func.parameters[0]!.name).toBe('arr');
      expect(func.parameters[0]!.type).toBe('array');
      expect(func.returnType).toBe('array');
      expect(func.body).toContain('array::distinct');
    });
  });

  describe('getAll', () => {
    it('should return all predefined functions', () => {
      const funcs = FunctionRegistry.getAll();

      expect(funcs).toHaveLength(5);
      expect(funcs.map((f) => f.name)).toEqual([
        'validate_email',
        'calculate_percentage',
        'generate_slug',
        'haversine_distance',
        'array_unique',
      ]);
    });

    it('should return valid function configs', () => {
      const funcs = FunctionRegistry.getAll();

      for (const func of funcs) {
        expect(func.name).toBeDefined();
        expect(typeof func.name).toBe('string');
        expect(Array.isArray(func.parameters)).toBe(true);
        expect(func.returnType).toBeDefined();
        expect(func.body).toBeDefined();
        expect(typeof func.body).toBe('string');
      }
    });
  });

  describe('getByName', () => {
    it('should return function by name when it exists', () => {
      const func = FunctionRegistry.getByName('validate_email');

      expect(func).toBeDefined();
      expect(func?.name).toBe('validate_email');
    });

    it('should return undefined for non-existent function', () => {
      const func = FunctionRegistry.getByName('non_existent_function');

      expect(func).toBeUndefined();
    });

    it('should find all registered functions by name', () => {
      const functionNames = [
        'validate_email',
        'calculate_percentage',
        'generate_slug',
        'haversine_distance',
        'array_unique',
      ];

      for (const name of functionNames) {
        const func = FunctionRegistry.getByName(name);
        expect(func).toBeDefined();
        expect(func?.name).toBe(name);
      }
    });

    it('should be case-sensitive', () => {
      const func = FunctionRegistry.getByName('VALIDATE_EMAIL');

      expect(func).toBeUndefined();
    });
  });

  describe('Function configurations', () => {
    it('should have unique function names', () => {
      const funcs = FunctionRegistry.getAll();
      const names = funcs.map((f) => f.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have non-empty bodies for all functions', () => {
      const funcs = FunctionRegistry.getAll();

      for (const func of funcs) {
        expect(func.body.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have comments for all functions', () => {
      const funcs = FunctionRegistry.getAll();

      for (const func of funcs) {
        expect(func.comment).toBeDefined();
        expect(typeof func.comment).toBe('string');
        expect(func.comment!.length).toBeGreaterThan(0);
      }
    });

    it('should have at least one parameter for each function', () => {
      const funcs = FunctionRegistry.getAll();

      for (const func of funcs) {
        expect(func.parameters.length).toBeGreaterThan(0);
      }
    });
  });
});
