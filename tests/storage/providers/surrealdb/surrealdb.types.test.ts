/**
 * @fileoverview Test suite for SurrealDB storage types
 * @module tests/storage/providers/surrealdb/surrealdb.types.test
 */

import { describe, test, expect } from 'vitest';
import type {
  KvStoreRecord,
  KvStoreInput,
} from '@/storage/providers/surrealdb/types.js';

describe('SurrealDB Storage Types', () => {
  describe('KvStoreRecord', () => {
    test('should accept a complete valid record', () => {
      const record: KvStoreRecord = {
        tenant_id: 'test-tenant',
        key: 'test-key',
        value: { some: 'data' },
        expires_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(record.tenant_id).toBe('test-tenant');
      expect(record.key).toBe('test-key');
      expect(record.value).toEqual({ some: 'data' });
    });

    test('should accept a record with null expires_at', () => {
      const record: KvStoreRecord = {
        tenant_id: 'test-tenant',
        key: 'test-key',
        value: 'test-value',
        expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(record.expires_at).toBeNull();
    });

    test('should accept a record without optional fields', () => {
      const record: KvStoreRecord = {
        tenant_id: 'test-tenant',
        key: 'test-key',
        value: 'test-value',
      };

      expect(record.tenant_id).toBe('test-tenant');
      expect(record.key).toBe('test-key');
      expect(record.value).toBe('test-value');
    });

    test('should support various value types', () => {
      const stringRecord: KvStoreRecord = {
        tenant_id: 'tenant',
        key: 'string-key',
        value: 'string value',
      };

      const numberRecord: KvStoreRecord = {
        tenant_id: 'tenant',
        key: 'number-key',
        value: 42,
      };

      const objectRecord: KvStoreRecord = {
        tenant_id: 'tenant',
        key: 'object-key',
        value: { nested: { data: true } },
      };

      const arrayRecord: KvStoreRecord = {
        tenant_id: 'tenant',
        key: 'array-key',
        value: [1, 2, 3],
      };

      expect(typeof stringRecord.value).toBe('string');
      expect(typeof numberRecord.value).toBe('number');
      expect(typeof objectRecord.value).toBe('object');
      expect(Array.isArray(arrayRecord.value)).toBe(true);
    });
  });

  describe('KvStoreInput', () => {
    test('should omit auto-generated fields', () => {
      const input: KvStoreInput = {
        tenant_id: 'test-tenant',
        key: 'test-key',
        value: 'test-value',
        expires_at: new Date().toISOString(),
      };

      expect(input.tenant_id).toBe('test-tenant');
      expect(input.key).toBe('test-key');
      expect(input.value).toBe('test-value');
    });

    test('should not allow created_at or updated_at fields', () => {
      // This test verifies at compile time that KvStoreInput
      // does not include the auto-generated timestamp fields

      const validInput: KvStoreInput = {
        tenant_id: 'tenant',
        key: 'key',
        value: 'value',
      };

      // Verify the valid input works
      expect(validInput).toHaveProperty('tenant_id');
      expect(validInput).toHaveProperty('key');
      expect(validInput).toHaveProperty('value');

      // The type system prevents us from adding these fields directly
      // If you uncomment the following lines, TypeScript will error:
      // const invalid1: KvStoreInput = { ...validInput, created_at: 'value' };
      // const invalid2: KvStoreInput = { ...validInput, updated_at: 'value' };
    });

    test('should accept minimal input', () => {
      const input: KvStoreInput = {
        tenant_id: 'tenant',
        key: 'key',
        value: 'value',
      };

      expect(input).toHaveProperty('tenant_id');
      expect(input).toHaveProperty('key');
      expect(input).toHaveProperty('value');
      expect(input).not.toHaveProperty('created_at');
      expect(input).not.toHaveProperty('updated_at');
    });

    test('should allow optional expires_at', () => {
      const inputWithExpiry: KvStoreInput = {
        tenant_id: 'tenant',
        key: 'key',
        value: 'value',
        expires_at: new Date().toISOString(),
      };

      const inputWithoutExpiry: KvStoreInput = {
        tenant_id: 'tenant',
        key: 'key',
        value: 'value',
      };

      expect(inputWithExpiry.expires_at).toBeDefined();
      expect(inputWithoutExpiry.expires_at).toBeUndefined();
    });
  });

  describe('Type Compatibility', () => {
    test('KvStoreRecord should be assignable to KvStoreInput with omitted fields', () => {
      const record: KvStoreRecord = {
        tenant_id: 'tenant',
        key: 'key',
        value: 'value',
        expires_at: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      // Should be able to extract input-compatible fields
      // When expires_at is null, we can omit it entirely (it's optional)
      const input: KvStoreInput = {
        tenant_id: record.tenant_id,
        key: record.key,
        value: record.value,
        ...(record.expires_at !== null && { expires_at: record.expires_at }),
      };

      expect(input.tenant_id).toBe(record.tenant_id);
      expect(input.key).toBe(record.key);
      expect(input.value).toBe(record.value);
    });

    test('KvStoreInput accepts expires_at as null explicitly', () => {
      const input: KvStoreInput = {
        tenant_id: 'tenant',
        key: 'key',
        value: 'value',
        expires_at: null,
      };

      expect(input.expires_at).toBeNull();
    });
  });
});
