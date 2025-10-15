/**
 * @fileoverview Generic compliance test suite for IStorageProvider.
 * This file exports a function that runs a standard set of tests against any
 * class that implements the IStorageProvider interface. This ensures that all
 * storage providers in the system behave consistently.
 * @module tests/storage/storageProviderCompliance
 */
import type { IStorageProvider } from '../../src/storage/core/IStorageProvider.js';
import { requestContextService } from '../../src/utils/internal/requestContext.js';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * A factory function that creates a new instance of a storage provider.
 */
type StorageProviderFactory = () => IStorageProvider;

/**
 * Runs a compliance test suite against a storage provider.
 * @param providerFactory A function that returns a new instance of the provider.
 * @param providerName The name of the provider, for test descriptions.
 */
export function storageProviderTests(
  providerFactory: StorageProviderFactory,
  providerName: string,
) {
  describe(`Storage Provider Compliance: ${providerName}`, () => {
    let provider: IStorageProvider;
    const testContext = requestContextService.createRequestContext({
      operation: 'storage-compliance-test',
    });
    const tenantId = 'test-tenant';

    // Use fake timers to test TTL
    beforeEach(() => {
      provider = providerFactory();
      // vi.useFakeTimers();
    });

    afterEach(() => {
      // vi.useRealTimers();
    });

    it('should set and get a string value', async () => {
      const key = 'test-string';
      const value = 'hello world';
      await provider.set(tenantId, key, value, testContext);
      const retrieved = await provider.get<string>(tenantId, key, testContext);
      expect(retrieved).toBe(value);
    });

    it('should set and get a number value', async () => {
      const key = 'test-number';
      const value = 12345;
      await provider.set(tenantId, key, value, testContext);
      const retrieved = await provider.get<number>(tenantId, key, testContext);
      expect(retrieved).toBe(value);
    });

    it('should set and get a complex object', async () => {
      const key = 'test-object';
      const value = { a: 1, b: { c: 'nested' }, d: [1, 2, 3] };
      await provider.set(tenantId, key, value, testContext);
      const retrieved = await provider.get<typeof value>(
        tenantId,
        key,
        testContext,
      );
      expect(retrieved).toEqual(value);
    });

    it('should return null for a non-existent key', async () => {
      const retrieved = await provider.get(
        tenantId,
        'non-existent-key',
        testContext,
      );
      expect(retrieved).toBeNull();
    });

    it('should overwrite an existing value', async () => {
      const key = 'test-overwrite';
      await provider.set(tenantId, key, 'initial', testContext);
      await provider.set(tenantId, key, 'overwritten', testContext);
      const retrieved = await provider.get<string>(tenantId, key, testContext);
      expect(retrieved).toBe('overwritten');
    });

    it('should delete a key and return true', async () => {
      const key = 'test-delete';
      await provider.set(tenantId, key, 'to-be-deleted', testContext);
      const wasDeleted = await provider.delete(tenantId, key, testContext);
      expect(wasDeleted).toBe(true);
      const retrieved = await provider.get(tenantId, key, testContext);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting a non-existent key', async () => {
      const wasDeleted = await provider.delete(
        tenantId,
        'non-existent-delete',
        testContext,
      );
      expect(wasDeleted).toBe(false);
    });

    it('should list keys matching a prefix', async () => {
      await provider.set(tenantId, 'prefix:key1', 1, testContext);
      await provider.set(tenantId, 'prefix:key2', 2, testContext);
      await provider.set(tenantId, 'another-prefix:key3', 3, testContext);

      const result = await provider.list(tenantId, 'prefix:', testContext);
      expect(result.keys).toHaveLength(2);
      expect(result.keys).toContain('prefix:key1');
      expect(result.keys).toContain('prefix:key2');
    });

    it('should return an empty array for a prefix that matches no keys', async () => {
      const result = await provider.list(tenantId, 'no-match:', testContext);
      expect(result.keys).toEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should support pagination with limit and cursor', async () => {
      // Set up multiple keys
      await provider.set(tenantId, 'page:key1', 1, testContext);
      await provider.set(tenantId, 'page:key2', 2, testContext);
      await provider.set(tenantId, 'page:key3', 3, testContext);

      // Get first page
      const page1 = await provider.list(tenantId, 'page:', testContext, {
        limit: 2,
      });
      expect(page1.keys).toHaveLength(2);

      // If there's a cursor, get the next page
      if (page1.nextCursor) {
        const page2 = await provider.list(tenantId, 'page:', testContext, {
          limit: 2,
          cursor: page1.nextCursor,
        });
        expect(page2.keys.length).toBeGreaterThan(0);
        // Ensure no overlap between pages
        for (const key of page2.keys) {
          expect(page1.keys).not.toContain(key);
        }
      }
    });

    it('should retrieve multiple values with getMany', async () => {
      await provider.set(tenantId, 'batch:key1', 'value1', testContext);
      await provider.set(tenantId, 'batch:key2', 'value2', testContext);
      await provider.set(tenantId, 'batch:key3', 'value3', testContext);

      const results = await provider.getMany<string>(
        tenantId,
        ['batch:key1', 'batch:key2', 'batch:nonexistent'],
        testContext,
      );

      expect(results.size).toBe(2);
      expect(results.get('batch:key1')).toBe('value1');
      expect(results.get('batch:key2')).toBe('value2');
      expect(results.has('batch:nonexistent')).toBe(false);
    });

    it('should store multiple values with setMany', async () => {
      const entries = new Map<string, unknown>([
        ['multi:key1', 'value1'],
        ['multi:key2', 42],
        ['multi:key3', { nested: true }],
      ]);

      await provider.setMany(tenantId, entries, testContext);

      const val1 = await provider.get<string>(
        tenantId,
        'multi:key1',
        testContext,
      );
      const val2 = await provider.get<number>(
        tenantId,
        'multi:key2',
        testContext,
      );
      const val3 = await provider.get<{ nested: boolean }>(
        tenantId,
        'multi:key3',
        testContext,
      );

      expect(val1).toBe('value1');
      expect(val2).toBe(42);
      expect(val3).toEqual({ nested: true });
    });

    it('should delete multiple values with deleteMany', async () => {
      await provider.set(tenantId, 'del:key1', 1, testContext);
      await provider.set(tenantId, 'del:key2', 2, testContext);
      await provider.set(tenantId, 'del:key3', 3, testContext);

      const deletedCount = await provider.deleteMany(
        tenantId,
        ['del:key1', 'del:key3', 'del:nonexistent'],
        testContext,
      );

      expect(deletedCount).toBe(2);

      const val1 = await provider.get(tenantId, 'del:key1', testContext);
      const val2 = await provider.get(tenantId, 'del:key2', testContext);
      const val3 = await provider.get(tenantId, 'del:key3', testContext);

      expect(val1).toBeNull();
      expect(val2).toBe(2); // Not deleted
      expect(val3).toBeNull();
    });

    it('should clear all keys for a tenant', async () => {
      await provider.set(tenantId, 'clear:key1', 1, testContext);
      await provider.set(tenantId, 'clear:key2', 2, testContext);
      await provider.set(tenantId, 'clear:key3', 3, testContext);

      const clearedCount = await provider.clear(tenantId, testContext);

      expect(clearedCount).toBeGreaterThanOrEqual(3);

      const result = await provider.list(tenantId, '', testContext);
      expect(result.keys).toHaveLength(0);
    });

    // it('should respect TTL and return null after expiration', async () => {
    //   const key = 'test-ttl';
    //   const value = 'ephemeral';
    //   const ttlInSeconds = 10;
    //
    //   await provider.set(key, value, testContext, { ttl: ttlInSeconds });
    //
    //   // Should exist immediately after setting
    //   let retrieved = await provider.get(key, testContext);
    //   expect(retrieved).toBe(value);
    //
    //   // Advance time just before expiration
    //   vi.advanceTimersByTime((ttlInSeconds - 1) * 1000);
    //   retrieved = await provider.get(key, testContext);
    //   expect(retrieved).toBe(value);
    //
    //   // Advance time past expiration
    //   vi.advanceTimersByTime(2 * 1000); // 1 sec past + 1 for boundary
    //   retrieved = await provider.get(key, testContext);
    //   expect(retrieved).toBeNull();
    // });
  });
}

// Add a basic test suite so this file isn't empty when run directly
describe('Storage Provider Compliance Test Suite', () => {
  it('compliance test function exists and is exported', () => {
    expect(storageProviderTests).toBeDefined();
    expect(typeof storageProviderTests).toBe('function');
  });

  it('compliance test documentation is available', () => {
    // This test documents that the actual compliance tests are run
    // in provider-specific test files like:
    // - tests/storage/providers/inMemory/inMemoryProvider.test.ts
    // - tests/storage/providers/fileSystem/fileSystemProvider.test.ts
    // - tests/storage/providers/cloudflare/kvProvider.test.ts
    // - tests/storage/providers/cloudflare/r2Provider.test.ts
    // Each provider test file calls storageProviderTests(factory, name)
    expect(true).toBe(true);
  });
});
