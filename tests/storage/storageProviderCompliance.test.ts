/**
 * @fileoverview Generic compliance test suite for IStorageProvider.
 * This file exports a function that runs a standard set of tests against any
 * class that implements the IStorageProvider interface. This ensures that all
 * storage providers in the system behave consistently.
 * @module tests/storage/storageProviderCompliance
 */
import { IStorageProvider } from '../../src/storage/core/IStorageProvider.js';
import { requestContextService } from '../../src/utils/internal/requestContext.js';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

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

      const keys = await provider.list(tenantId, 'prefix:', testContext);
      expect(keys).toHaveLength(2);
      expect(keys).toContain('prefix:key1');
      expect(keys).toContain('prefix:key2');
    });

    it('should return an empty array for a prefix that matches no keys', async () => {
      const keys = await provider.list(tenantId, 'no-match:', testContext);
      expect(keys).toEqual([]);
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
