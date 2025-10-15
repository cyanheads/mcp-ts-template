/**
 * @fileoverview Test suite for storage validation utilities
 * @module tests/storage/core/storageValidation.test
 */

import { describe, expect, it } from 'vitest';
import {
  validateTenantId,
  validateKey,
  validatePrefix,
  validateStorageOptions,
  validateListOptions,
  encodeCursor,
  decodeCursor,
} from '@/storage/core/storageValidation.js';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import type { RequestContext } from '@/utils/index.js';

describe('Storage Validation', () => {
  const context: RequestContext = {
    requestId: 'test-id',
    timestamp: new Date().toISOString(),
  };

  describe('validateTenantId', () => {
    it('should accept valid tenant IDs', () => {
      expect(() => validateTenantId('tenant-123', context)).not.toThrow();
      expect(() => validateTenantId('test_tenant', context)).not.toThrow();
      expect(() => validateTenantId('tenant.123', context)).not.toThrow();
      expect(() => validateTenantId('a1b2c3', context)).not.toThrow();
    });

    it('should reject empty tenant ID', () => {
      expect(() => validateTenantId('', context)).toThrow(McpError);
      expect(() => validateTenantId('', context)).toThrow(
        /Tenant ID cannot be an empty string/,
      );
    });

    it('should reject tenant ID with path traversal', () => {
      expect(() => validateTenantId('../malicious', context)).toThrow(McpError);
      expect(() => validateTenantId('..\\malicious', context)).toThrow(
        McpError,
      );
    });

    it('should reject tenant ID with consecutive dots', () => {
      expect(() => validateTenantId('tenant..id', context)).toThrow(McpError);
    });

    it('should reject tenant ID that is too long', () => {
      const longId = 'a'.repeat(129);
      expect(() => validateTenantId(longId, context)).toThrow(McpError);
    });

    it('should reject tenant ID with invalid characters', () => {
      expect(() => validateTenantId('tenant@id', context)).toThrow(McpError);
      expect(() => validateTenantId('tenant id', context)).toThrow(McpError);
      expect(() => validateTenantId('tenant/id', context)).toThrow(McpError);
    });

    it('should throw McpError with InvalidParams code', () => {
      expect(() => validateTenantId('', context)).toThrow(McpError);

      try {
        validateTenantId('', context);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(JsonRpcErrorCode.InvalidParams);
      }
    });
  });

  describe('validateKey', () => {
    it('should accept valid keys', () => {
      expect(() => validateKey('user123', context)).not.toThrow();
      expect(() => validateKey('data-key', context)).not.toThrow();
      expect(() => validateKey('key_with_underscore', context)).not.toThrow();
      expect(() => validateKey('path/to/key', context)).not.toThrow();
    });

    it('should reject empty key', () => {
      expect(() => validateKey('', context)).toThrow(McpError);
      expect(() => validateKey('', context)).toThrow(
        /Key must be a non-empty string/,
      );
    });

    it('should reject key that is too long', () => {
      const longKey = 'k'.repeat(1025);
      expect(() => validateKey(longKey, context)).toThrow(McpError);
    });

    it('should throw McpError with ValidationError code', () => {
      expect(() => validateKey('', context)).toThrow(McpError);

      try {
        validateKey('', context);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(JsonRpcErrorCode.ValidationError);
      }
    });
  });

  describe('validatePrefix', () => {
    it('should accept valid prefixes', () => {
      expect(() => validatePrefix('user', context)).not.toThrow();
      expect(() => validatePrefix('', context)).not.toThrow();
      expect(() => validatePrefix('namespace/', context)).not.toThrow();
      expect(() => validatePrefix('data-prefix', context)).not.toThrow();
    });

    it('should reject prefix that is too long', () => {
      const longPrefix = 'p'.repeat(513);
      expect(() => validatePrefix(longPrefix, context)).toThrow(McpError);
    });

    it('should throw McpError with ValidationError code', () => {
      const longPrefix = 'p'.repeat(513);
      expect(() => validatePrefix(longPrefix, context)).toThrow(McpError);

      try {
        validatePrefix(longPrefix, context);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(JsonRpcErrorCode.ValidationError);
      }
    });
  });

  describe('validateStorageOptions', () => {
    it('should accept valid storage options', () => {
      expect(() =>
        validateStorageOptions({ ttl: 3600 }, context),
      ).not.toThrow();
      expect(() => validateStorageOptions({}, context)).not.toThrow();
      expect(() => validateStorageOptions(undefined, context)).not.toThrow();
    });

    it('should accept ttl of 0 (immediate expiration)', () => {
      expect(() => validateStorageOptions({ ttl: 0 }, context)).not.toThrow();
    });

    it('should reject negative ttl', () => {
      expect(() => validateStorageOptions({ ttl: -1 }, context)).toThrow(
        McpError,
      );
    });

    it('should throw McpError with ValidationError code', () => {
      expect(() => validateStorageOptions({ ttl: -1 }, context)).toThrow(
        McpError,
      );

      try {
        validateStorageOptions({ ttl: -1 }, context);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(JsonRpcErrorCode.ValidationError);
      }
    });
  });

  describe('validateListOptions', () => {
    it('should accept valid list options', () => {
      expect(() => validateListOptions({ limit: 100 }, context)).not.toThrow();
      expect(() =>
        validateListOptions({ cursor: 'abc123' }, context),
      ).not.toThrow();
      expect(() => validateListOptions({}, context)).not.toThrow();
      expect(() => validateListOptions(undefined, context)).not.toThrow();
    });

    it('should reject negative limit', () => {
      expect(() => validateListOptions({ limit: -1 }, context)).toThrow(
        McpError,
      );
    });

    it('should reject limit of 0', () => {
      expect(() => validateListOptions({ limit: 0 }, context)).toThrow(
        McpError,
      );
    });

    it('should reject limit greater than maximum', () => {
      expect(() => validateListOptions({ limit: 10001 }, context)).toThrow(
        McpError,
      );
    });

    it('should throw McpError with ValidationError code', () => {
      expect(() => validateListOptions({ limit: -1 }, context)).toThrow(
        McpError,
      );

      try {
        validateListOptions({ limit: -1 }, context);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(JsonRpcErrorCode.ValidationError);
      }
    });
  });

  describe('encodeCursor', () => {
    it('should encode cursor with lastKey and tenantId', () => {
      const cursor = encodeCursor('last-key', 'tenant-123');
      expect(cursor).toBeDefined();
      expect(typeof cursor).toBe('string');
      expect(cursor.length).toBeGreaterThan(0);
    });

    it('should produce different cursors for different inputs', () => {
      const cursor1 = encodeCursor('key1', 'tenant1');
      const cursor2 = encodeCursor('key2', 'tenant1');
      const cursor3 = encodeCursor('key1', 'tenant2');

      expect(cursor1).not.toBe(cursor2);
      expect(cursor1).not.toBe(cursor3);
      expect(cursor2).not.toBe(cursor3);
    });

    it('should be reversible via decodeCursor', () => {
      const lastKey = 'test-key-123';
      const tenantId = 'tenant-456';
      const cursor = encodeCursor(lastKey, tenantId);
      const decoded = decodeCursor(cursor, tenantId, context);

      expect(decoded).toBe(lastKey);
    });
  });

  describe('decodeCursor', () => {
    it('should decode valid cursor', () => {
      const cursor = encodeCursor('my-key', 'my-tenant');
      const decoded = decodeCursor(cursor, 'my-tenant', context);

      expect(decoded).toBe('my-key');
    });

    it('should reject cursor for different tenant', () => {
      const cursor = encodeCursor('key', 'tenant1');

      expect(() => decodeCursor(cursor, 'tenant2', context)).toThrow(McpError);
    });

    it('should reject invalid cursor format', () => {
      expect(() => decodeCursor('invalid-cursor', 'tenant', context)).toThrow(
        McpError,
      );
    });

    it('should throw McpError with InvalidParams code for invalid cursor', () => {
      expect(() => decodeCursor('invalid', 'tenant', context)).toThrow(
        McpError,
      );

      try {
        decodeCursor('invalid', 'tenant', context);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(JsonRpcErrorCode.InvalidParams);
      }
    });

    it('should throw McpError with InvalidParams code for tenant mismatch', () => {
      const cursor = encodeCursor('key', 'tenant1');

      expect(() => decodeCursor(cursor, 'tenant2', context)).toThrow(McpError);

      try {
        decodeCursor(cursor, 'tenant2', context);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(JsonRpcErrorCode.InvalidParams);
      }
    });
  });

  describe('Function Export Verification', () => {
    it('should export all validation functions', () => {
      expect(validateTenantId).toBeDefined();
      expect(typeof validateTenantId).toBe('function');

      expect(validateKey).toBeDefined();
      expect(typeof validateKey).toBe('function');

      expect(validatePrefix).toBeDefined();
      expect(typeof validatePrefix).toBe('function');

      expect(validateStorageOptions).toBeDefined();
      expect(typeof validateStorageOptions).toBe('function');

      expect(validateListOptions).toBeDefined();
      expect(typeof validateListOptions).toBe('function');

      expect(encodeCursor).toBeDefined();
      expect(typeof encodeCursor).toBe('function');

      expect(decodeCursor).toBeDefined();
      expect(typeof decodeCursor).toBe('function');
    });
  });
});
