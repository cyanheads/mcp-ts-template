/**
 * @fileoverview Test suite for storage provider interface
 * @module tests/storage/core/IStorageProvider.test
 */

import { describe, expect, it } from 'vitest';
import type {
  IStorageProvider,
  StorageOptions,
  ListOptions,
  ListResult,
} from '@/storage/core/IStorageProvider.js';
import type { RequestContext } from '@/utils/index.js';

describe('IStorageProvider Interface', () => {
  describe('Interface Contract', () => {
    it('should define get method signature', () => {
      // Type test: verify interface has get method
      const mockProvider: IStorageProvider = {
        get: async <T>(
          _tenantId: string,
          _key: string,
          _context: RequestContext,
        ): Promise<T | null> => null,
        set: async () => {},
        delete: async () => false,
        list: async () => ({ keys: [] }),
        getMany: async () => new Map(),
        setMany: async () => {},
        deleteMany: async () => 0,
        clear: async () => 0,
      };

      expect(mockProvider.get).toBeDefined();
      expect(typeof mockProvider.get).toBe('function');
    });

    it('should define set method signature', () => {
      const mockProvider: IStorageProvider = {
        get: async () => null,
        set: async (
          _tenantId: string,
          _key: string,
          _value: unknown,
          _context: RequestContext,
          _options?: StorageOptions,
        ): Promise<void> => {},
        delete: async () => false,
        list: async () => ({ keys: [] }),
        getMany: async () => new Map(),
        setMany: async () => {},
        deleteMany: async () => 0,
        clear: async () => 0,
      };

      expect(mockProvider.set).toBeDefined();
      expect(typeof mockProvider.set).toBe('function');
    });

    it('should define delete method signature', () => {
      const mockProvider: IStorageProvider = {
        get: async () => null,
        set: async () => {},
        delete: async (
          _tenantId: string,
          _key: string,
          _context: RequestContext,
        ): Promise<boolean> => false,
        list: async () => ({ keys: [] }),
        getMany: async () => new Map(),
        setMany: async () => {},
        deleteMany: async () => 0,
        clear: async () => 0,
      };

      expect(mockProvider.delete).toBeDefined();
      expect(typeof mockProvider.delete).toBe('function');
    });

    it('should define list method signature', () => {
      const mockProvider: IStorageProvider = {
        get: async () => null,
        set: async () => {},
        delete: async () => false,
        list: async (
          _tenantId: string,
          _prefix: string,
          _context: RequestContext,
          _options?: ListOptions,
        ): Promise<ListResult> => ({ keys: [] }),
        getMany: async () => new Map(),
        setMany: async () => {},
        deleteMany: async () => 0,
        clear: async () => 0,
      };

      expect(mockProvider.list).toBeDefined();
      expect(typeof mockProvider.list).toBe('function');
    });

    it('should define getMany method signature', () => {
      const mockProvider: IStorageProvider = {
        get: async () => null,
        set: async () => {},
        delete: async () => false,
        list: async () => ({ keys: [] }),
        getMany: async <T>(
          _tenantId: string,
          _keys: string[],
          _context: RequestContext,
        ): Promise<Map<string, T>> => new Map(),
        setMany: async () => {},
        deleteMany: async () => 0,
        clear: async () => 0,
      };

      expect(mockProvider.getMany).toBeDefined();
      expect(typeof mockProvider.getMany).toBe('function');
    });

    it('should define setMany method signature', () => {
      const mockProvider: IStorageProvider = {
        get: async () => null,
        set: async () => {},
        delete: async () => false,
        list: async () => ({ keys: [] }),
        getMany: async () => new Map(),
        setMany: async (
          _tenantId: string,
          _entries: Map<string, unknown>,
          _context: RequestContext,
          _options?: StorageOptions,
        ): Promise<void> => {},
        deleteMany: async () => 0,
        clear: async () => 0,
      };

      expect(mockProvider.setMany).toBeDefined();
      expect(typeof mockProvider.setMany).toBe('function');
    });

    it('should define deleteMany method signature', () => {
      const mockProvider: IStorageProvider = {
        get: async () => null,
        set: async () => {},
        delete: async () => false,
        list: async () => ({ keys: [] }),
        getMany: async () => new Map(),
        setMany: async () => {},
        deleteMany: async (
          _tenantId: string,
          _keys: string[],
          _context: RequestContext,
        ): Promise<number> => 0,
        clear: async () => 0,
      };

      expect(mockProvider.deleteMany).toBeDefined();
      expect(typeof mockProvider.deleteMany).toBe('function');
    });
  });

  describe('Type Definitions', () => {
    it('should define StorageOptions interface', () => {
      const options: StorageOptions = {
        ttl: 3600,
      };

      expect(options).toBeDefined();
      expect(typeof options.ttl).toBe('number');
    });

    it('should allow StorageOptions without ttl', () => {
      const options: StorageOptions = {};

      expect(options).toBeDefined();
    });

    it('should define ListOptions interface', () => {
      const options: ListOptions = {
        limit: 100,
        cursor: 'abc123',
      };

      expect(options).toBeDefined();
      expect(typeof options.limit).toBe('number');
      expect(typeof options.cursor).toBe('string');
    });

    it('should allow ListOptions without parameters', () => {
      const options: ListOptions = {};

      expect(options).toBeDefined();
    });

    it('should define ListResult interface', () => {
      const result: ListResult = {
        keys: ['key1', 'key2', 'key3'],
        nextCursor: 'def456',
      };

      expect(result).toBeDefined();
      expect(Array.isArray(result.keys)).toBe(true);
      expect(typeof result.nextCursor).toBe('string');
    });

    it('should allow ListResult without nextCursor', () => {
      const result: ListResult = {
        keys: ['key1', 'key2'],
      };

      expect(result).toBeDefined();
      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe('Implementation Compliance', () => {
    it('should accept a complete implementation', async () => {
      const mockProvider: IStorageProvider = {
        get: async () => null,
        set: async () => {},
        delete: async () => true,
        list: async () => ({ keys: ['test-key'] }),
        getMany: async <T>() => new Map<string, T>([['key1', 'value1' as T]]),
        setMany: async () => {},
        deleteMany: async () => 1,
        clear: async () => 0,
      };

      // Verify all methods can be called
      const context = {
        requestId: 'test-id',
        timestamp: new Date().toISOString(),
      };
      const tenantId = 'test-tenant';

      await expect(
        mockProvider.get(tenantId, 'key', context),
      ).resolves.toBeNull();
      await expect(
        mockProvider.set(tenantId, 'key', 'value', context),
      ).resolves.toBeUndefined();
      await expect(mockProvider.delete(tenantId, 'key', context)).resolves.toBe(
        true,
      );
      await expect(
        mockProvider.list(tenantId, 'prefix', context),
      ).resolves.toEqual({ keys: ['test-key'] });
      await expect(
        mockProvider.getMany(tenantId, ['key1'], context),
      ).resolves.toBeInstanceOf(Map);
      await expect(
        mockProvider.setMany(tenantId, new Map([['key', 'value']]), context),
      ).resolves.toBeUndefined();
      await expect(
        mockProvider.deleteMany(tenantId, ['key1'], context),
      ).resolves.toBe(1);
    });

    it('should support generic types for get method', async () => {
      const mockProvider: IStorageProvider = {
        get: async <T>(): Promise<T | null> => ({ data: 'test' }) as T,
        set: async () => {},
        delete: async () => false,
        list: async () => ({ keys: [] }),
        getMany: async () => new Map(),
        setMany: async () => {},
        deleteMany: async () => 0,
        clear: async () => 0,
      };

      const context = {
        requestId: 'test-id',
        timestamp: new Date().toISOString(),
      };
      const tenantId = 'test-tenant';

      const result = await mockProvider.get<{ data: string }>(
        tenantId,
        'key',
        context,
      );
      expect(result).toBeDefined();
      expect(result?.data).toBe('test');
    });
  });
});
