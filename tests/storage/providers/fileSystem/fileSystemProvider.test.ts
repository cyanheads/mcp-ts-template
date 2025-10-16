/**
 * @fileoverview Tests for the FileSystem storage provider.
 * @module tests/storage/providers/fileSystem/fileSystemProvider.test.ts
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { rmSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { FileSystemProvider } from '@/storage/providers/fileSystem/fileSystemProvider.js';
import { McpError } from '@/types-global/errors.js';
import { requestContextService } from '@/utils/index.js';

const TEST_STORAGE_PATH = path.join(process.cwd(), '.test-storage-fs');

describe('FileSystemProvider', () => {
  let provider: FileSystemProvider;
  let testContext: ReturnType<
    typeof requestContextService.createRequestContext
  >;

  beforeEach(() => {
    // Clean up any existing test storage
    if (existsSync(TEST_STORAGE_PATH)) {
      rmSync(TEST_STORAGE_PATH, { recursive: true, force: true });
    }
    mkdirSync(TEST_STORAGE_PATH, { recursive: true });

    provider = new FileSystemProvider(TEST_STORAGE_PATH);
    testContext = requestContextService.createRequestContext({
      operation: 'test',
    });
  });

  afterEach(() => {
    // Clean up after each test
    if (existsSync(TEST_STORAGE_PATH)) {
      rmSync(TEST_STORAGE_PATH, { recursive: true, force: true });
    }
  });

  describe('Constructor', () => {
    it('should create provider with valid storage path', () => {
      expect(provider).toBeDefined();
      expect(existsSync(TEST_STORAGE_PATH)).toBe(true);
    });

    it('should create storage directory if it does not exist', () => {
      const newPath = path.join(TEST_STORAGE_PATH, 'new-dir');
      const newProvider = new FileSystemProvider(newPath);
      expect(existsSync(newPath)).toBe(true);
      expect(newProvider).toBeDefined();
    });

    it('should throw error when storage path is empty', () => {
      expect(() => new FileSystemProvider('')).toThrow(McpError);
    });
  });

  describe('Basic CRUD Operations', () => {
    it('should set and get a value', async () => {
      await provider.set('tenant1', 'key1', { data: 'value1' }, testContext);
      const result = await provider.get<{ data: string }>(
        'tenant1',
        'key1',
        testContext,
      );

      expect(result).toEqual({ data: 'value1' });
    });

    it('should return null for non-existent key', async () => {
      const result = await provider.get('tenant1', 'nonexistent', testContext);
      expect(result).toBeNull();
    });

    it('should delete existing key', async () => {
      await provider.set('tenant1', 'key1', { data: 'value1' }, testContext);
      const deleted = await provider.delete('tenant1', 'key1', testContext);

      expect(deleted).toBe(true);

      const result = await provider.get('tenant1', 'key1', testContext);
      expect(result).toBeNull();
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await provider.delete(
        'tenant1',
        'nonexistent',
        testContext,
      );
      expect(deleted).toBe(false);
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        user: {
          id: 123,
          name: 'Test User',
          settings: {
            theme: 'dark',
            notifications: true,
          },
        },
        metadata: ['tag1', 'tag2'],
      };

      await provider.set('tenant1', 'complex', complexData, testContext);
      const result = await provider.get('tenant1', 'complex', testContext);

      expect(result).toEqual(complexData);
    });
  });

  describe('Tenant Isolation', () => {
    it('should isolate data between different tenants', async () => {
      await provider.set(
        'tenant1',
        'shared-key',
        { value: 'tenant1-data' },
        testContext,
      );
      await provider.set(
        'tenant2',
        'shared-key',
        { value: 'tenant2-data' },
        testContext,
      );

      const result1 = await provider.get('tenant1', 'shared-key', testContext);
      const result2 = await provider.get('tenant2', 'shared-key', testContext);

      expect(result1).toEqual({ value: 'tenant1-data' });
      expect(result2).toEqual({ value: 'tenant2-data' });
    });

    it('should not allow cross-tenant data access', async () => {
      await provider.set(
        'tenant1',
        'key1',
        { secret: 'tenant1-secret' },
        testContext,
      );

      const result = await provider.get('tenant2', 'key1', testContext);
      expect(result).toBeNull();
    });

    it('should handle tenant-specific deletion', async () => {
      await provider.set('tenant1', 'key1', { data: 'value1' }, testContext);
      await provider.set('tenant2', 'key1', { data: 'value2' }, testContext);

      await provider.delete('tenant1', 'key1', testContext);

      const result1 = await provider.get('tenant1', 'key1', testContext);
      const result2 = await provider.get('tenant2', 'key1', testContext);

      expect(result1).toBeNull();
      expect(result2).toEqual({ data: 'value2' });
    });
  });

  describe('Path Traversal Security', () => {
    it('should prevent path traversal with ../ in key', async () => {
      await expect(
        provider.set(
          'tenant1',
          '../../../etc/passwd',
          { data: 'evil' },
          testContext,
        ),
      ).rejects.toThrow(McpError);
    });

    it('should prevent path traversal with ../ in tenant ID', async () => {
      const evilProvider = new FileSystemProvider(TEST_STORAGE_PATH);
      await expect(
        evilProvider.set(
          '../../evil-tenant',
          'key1',
          { data: 'evil' },
          testContext,
        ),
      ).rejects.toThrow(McpError);
    });

    it('should sanitize tenant IDs containing slashes', async () => {
      await expect(
        provider.set(
          'tenant/with/slashes',
          'key1',
          { data: 'test' },
          testContext,
        ),
      ).rejects.toThrow(McpError);
    });
  });

  describe('TTL and Expiration', () => {
    it('should respect TTL and expire entries', async () => {
      // Set with 200ms TTL (optimized for faster tests)
      await provider.set(
        'tenant1',
        'expiring-key',
        { data: 'temporary' },
        testContext,
        {
          ttl: 0.2,
        },
      );

      // Should exist immediately
      let result = await provider.get('tenant1', 'expiring-key', testContext);
      expect(result).toEqual({ data: 'temporary' });

      // Wait for expiration (300ms = 200ms TTL + 100ms buffer)
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should be null after expiration
      result = await provider.get('tenant1', 'expiring-key', testContext);
      expect(result).toBeNull();
    });

    it('should allow entries without TTL', async () => {
      await provider.set(
        'tenant1',
        'permanent-key',
        { data: 'permanent' },
        testContext,
      );

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await provider.get(
        'tenant1',
        'permanent-key',
        testContext,
      );
      expect(result).toEqual({ data: 'permanent' });
    });

    it('should filter out expired entries in list operation', async () => {
      await provider.set('tenant1', 'key1', { data: 'permanent' }, testContext);
      await provider.set(
        'tenant1',
        'key2',
        { data: 'temporary' },
        testContext,
        { ttl: 0.2 },
      );

      // Wait for expiration (300ms = 200ms TTL + 100ms buffer)
      await new Promise((resolve) => setTimeout(resolve, 300));

      const listResult = await provider.list('tenant1', '', testContext);

      expect(listResult.keys).toContain('key1');
      expect(listResult.keys).not.toContain('key2');
    });
  });

  describe('Batch Operations', () => {
    describe('getMany', () => {
      it('should retrieve multiple keys', async () => {
        await provider.set('tenant1', 'key1', { value: 1 }, testContext);
        await provider.set('tenant1', 'key2', { value: 2 }, testContext);
        await provider.set('tenant1', 'key3', { value: 3 }, testContext);

        const results = await provider.getMany<{ value: number }>(
          'tenant1',
          ['key1', 'key2', 'key3'],
          testContext,
        );

        expect(results.size).toBe(3);
        expect(results.get('key1')).toEqual({ value: 1 });
        expect(results.get('key2')).toEqual({ value: 2 });
        expect(results.get('key3')).toEqual({ value: 3 });
      });

      it('should skip non-existent keys in getMany', async () => {
        await provider.set('tenant1', 'key1', { value: 1 }, testContext);

        const results = await provider.getMany(
          'tenant1',
          ['key1', 'nonexistent', 'key3'],
          testContext,
        );

        expect(results.size).toBe(1);
        expect(results.has('key1')).toBe(true);
        expect(results.has('nonexistent')).toBe(false);
      });
    });

    describe('setMany', () => {
      it('should set multiple entries at once', async () => {
        const entries = new Map([
          ['key1', { value: 1 }],
          ['key2', { value: 2 }],
          ['key3', { value: 3 }],
        ]);

        await provider.setMany('tenant1', entries, testContext);

        const result1 = await provider.get('tenant1', 'key1', testContext);
        const result2 = await provider.get('tenant1', 'key2', testContext);
        const result3 = await provider.get('tenant1', 'key3', testContext);

        expect(result1).toEqual({ value: 1 });
        expect(result2).toEqual({ value: 2 });
        expect(result3).toEqual({ value: 3 });
      });

      it('should apply TTL to all entries in setMany', async () => {
        const entries = new Map([
          ['key1', { value: 1 }],
          ['key2', { value: 2 }],
        ]);

        await provider.setMany('tenant1', entries, testContext, { ttl: 0.2 });

        // Wait for expiration (300ms = 200ms TTL + 100ms buffer)
        await new Promise((resolve) => setTimeout(resolve, 300));

        const result1 = await provider.get('tenant1', 'key1', testContext);
        const result2 = await provider.get('tenant1', 'key2', testContext);

        expect(result1).toBeNull();
        expect(result2).toBeNull();
      });
    });

    describe('deleteMany', () => {
      it('should delete multiple keys and return count', async () => {
        await provider.set('tenant1', 'key1', { value: 1 }, testContext);
        await provider.set('tenant1', 'key2', { value: 2 }, testContext);
        await provider.set('tenant1', 'key3', { value: 3 }, testContext);

        const deletedCount = await provider.deleteMany(
          'tenant1',
          ['key1', 'key2'],
          testContext,
        );

        expect(deletedCount).toBe(2);

        const result1 = await provider.get('tenant1', 'key1', testContext);
        const result2 = await provider.get('tenant1', 'key2', testContext);
        const result3 = await provider.get('tenant1', 'key3', testContext);

        expect(result1).toBeNull();
        expect(result2).toBeNull();
        expect(result3).toEqual({ value: 3 });
      });

      it('should handle mixed existent and non-existent keys', async () => {
        await provider.set('tenant1', 'key1', { value: 1 }, testContext);

        const deletedCount = await provider.deleteMany(
          'tenant1',
          ['key1', 'nonexistent'],
          testContext,
        );

        expect(deletedCount).toBe(1);
      });
    });
  });

  describe('List Operation', () => {
    it('should list all keys with empty prefix', async () => {
      await provider.set('tenant1', 'key1', { value: 1 }, testContext);
      await provider.set('tenant1', 'key2', { value: 2 }, testContext);
      await provider.set('tenant1', 'key3', { value: 3 }, testContext);

      const result = await provider.list('tenant1', '', testContext);

      expect(result.keys).toHaveLength(3);
      expect(result.keys).toContain('key1');
      expect(result.keys).toContain('key2');
      expect(result.keys).toContain('key3');
    });

    it('should filter by prefix', async () => {
      await provider.set('tenant1', 'user:1', { name: 'User 1' }, testContext);
      await provider.set('tenant1', 'user:2', { name: 'User 2' }, testContext);
      await provider.set('tenant1', 'post:1', { title: 'Post 1' }, testContext);

      const result = await provider.list('tenant1', 'user:', testContext);

      expect(result.keys).toHaveLength(2);
      expect(result.keys).toContain('user:1');
      expect(result.keys).toContain('user:2');
      expect(result.keys).not.toContain('post:1');
    });

    it('should support pagination with cursor', async () => {
      // Create more items than default limit
      for (let i = 0; i < 20; i++) {
        await provider.set('tenant1', `key${i}`, { value: i }, testContext);
      }

      // First page
      const page1 = await provider.list('tenant1', '', testContext, {
        limit: 5,
      });
      expect(page1.keys).toHaveLength(5);
      expect(page1.nextCursor).toBeDefined();

      // Second page using cursor
      const page2 = await provider.list('tenant1', '', testContext, {
        limit: 5,
        ...(page1.nextCursor && { cursor: page1.nextCursor }),
      });
      expect(page2.keys).toHaveLength(5);
      expect(page2.nextCursor).toBeDefined();

      // Ensure no overlap
      const allKeys = [...page1.keys, ...page2.keys];
      const uniqueKeys = new Set(allKeys);
      expect(uniqueKeys.size).toBe(10);
    });

    it('should return no nextCursor when all results fit in one page', async () => {
      await provider.set('tenant1', 'key1', { value: 1 }, testContext);
      await provider.set('tenant1', 'key2', { value: 2 }, testContext);

      const result = await provider.list('tenant1', '', testContext, {
        limit: 10,
      });

      expect(result.keys).toHaveLength(2);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should list keys in sorted order', async () => {
      await provider.set('tenant1', 'zebra', { value: 1 }, testContext);
      await provider.set('tenant1', 'apple', { value: 2 }, testContext);
      await provider.set('tenant1', 'mango', { value: 3 }, testContext);

      const result = await provider.list('tenant1', '', testContext);

      expect(result.keys[0]).toBe('apple');
      expect(result.keys[1]).toBe('mango');
      expect(result.keys[2]).toBe('zebra');
    });
  });

  describe('Clear Operation', () => {
    it('should clear all keys for a tenant', async () => {
      await provider.set('tenant1', 'key1', { value: 1 }, testContext);
      await provider.set('tenant1', 'key2', { value: 2 }, testContext);
      await provider.set('tenant1', 'key3', { value: 3 }, testContext);

      const deletedCount = await provider.clear('tenant1', testContext);

      expect(deletedCount).toBe(3);

      const result = await provider.list('tenant1', '', testContext);
      expect(result.keys).toHaveLength(0);
    });

    it('should only clear specified tenant', async () => {
      await provider.set('tenant1', 'key1', { value: 1 }, testContext);
      await provider.set('tenant2', 'key1', { value: 2 }, testContext);

      await provider.clear('tenant1', testContext);

      const result1 = await provider.get('tenant1', 'key1', testContext);
      const result2 = await provider.get('tenant2', 'key1', testContext);

      expect(result1).toBeNull();
      expect(result2).toEqual({ value: 2 });
    });

    it('should return 0 when clearing empty tenant', async () => {
      const deletedCount = await provider.clear('empty-tenant', testContext);
      expect(deletedCount).toBe(0);
    });
  });

  describe('Nested Keys (Path Support)', () => {
    it('should support nested path-like keys', async () => {
      await provider.set(
        'tenant1',
        'users/123/profile',
        { name: 'Test' },
        testContext,
      );
      await provider.set(
        'tenant1',
        'users/123/settings',
        { theme: 'dark' },
        testContext,
      );

      const profile = await provider.get(
        'tenant1',
        'users/123/profile',
        testContext,
      );
      const settings = await provider.get(
        'tenant1',
        'users/123/settings',
        testContext,
      );

      expect(profile).toEqual({ name: 'Test' });
      expect(settings).toEqual({ theme: 'dark' });
    });

    it('should list nested keys with prefix filtering', async () => {
      await provider.set('tenant1', 'users/1/data', { value: 1 }, testContext);
      await provider.set('tenant1', 'users/2/data', { value: 2 }, testContext);
      await provider.set('tenant1', 'posts/1/data', { value: 3 }, testContext);

      const result = await provider.list('tenant1', 'users/', testContext);

      expect(result.keys).toHaveLength(2);
      expect(result.keys).toContain('users/1/data');
      expect(result.keys).toContain('users/2/data');
    });
  });

  describe('Error Handling', () => {
    it('should handle serialization of circular references', async () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      await expect(
        provider.set('tenant1', 'circular', circular, testContext),
      ).rejects.toThrow();
    });

    it('should handle very long keys up to filesystem limits', async () => {
      // Use a reasonably long key that stays within filesystem limits
      const longKey = 'a'.repeat(200);
      await provider.set('tenant1', longKey, { data: 'test' }, testContext);

      const result = await provider.get('tenant1', longKey, testContext);
      expect(result).toEqual({ data: 'test' });
    });
  });

  describe('Legacy Data Format Support', () => {
    it('should handle legacy data without envelope', async () => {
      // Simulate legacy data by directly writing JSON without envelope
      const fs = await import('fs/promises');
      const tenantPath = path.join(TEST_STORAGE_PATH, 'tenant1');
      mkdirSync(tenantPath, { recursive: true });
      await fs.writeFile(
        path.join(tenantPath, 'legacy-key'),
        JSON.stringify({ legacyData: 'test' }),
        'utf-8',
      );

      const result = await provider.get('tenant1', 'legacy-key', testContext);
      expect(result).toEqual({ legacyData: 'test' });
    });
  });
});
