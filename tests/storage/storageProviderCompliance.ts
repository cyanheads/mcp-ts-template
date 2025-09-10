/**
 * @fileoverview A generic, reusable test suite for IStorageProvider implementations.
 * This ensures that all storage providers adhere to the same contract and behavior.
 * @module tests/storage/storageProviderCompliance
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { IStorageProvider } from '../../src/storage/core/IStorageProvider.js';
import { requestContextService } from '../../src/utils/index.js';

/**
 * A generic test suite that can be run against any provider implementing the
 * IStorageProvider interface to ensure consistent behavior.
 * @param providerFactory - A function that returns a new instance of the provider to be tested.
 * @param providerName - The name of the provider, used for test descriptions.
 * @param setup - Optional async function to run before all tests in the suite.
 * @param teardown - Optional async function to run after all tests in the suite.
 */
export function storageProviderTests(
  providerFactory: () => IStorageProvider,
  providerName: string,
  setup?: () => Promise<void>,
  teardown?: () => Promise<void>,
) {
  describe(`IStorageProvider Compliance Tests: ${providerName}`, () => {
    let provider: IStorageProvider;
    const context = requestContextService.createRequestContext({
      operation: 'test',
    });

    beforeAll(async () => {
      if (setup) await setup();
    });

    afterAll(async () => {
      if (teardown) await teardown();
    });

    beforeEach(() => {
      provider = providerFactory();
    });

    it('should set and get a value', async () => {
      const key = 'test-key';
      const value = { a: 1, b: 'hello' };
      await provider.set(key, value, context);
      const result = await provider.get(key, context);
      expect(result).toEqual(value);
    });

    it('should return null for a non-existent key', async () => {
      const result = await provider.get('non-existent-key', context);
      expect(result).toBeNull();
    });

    it('should overwrite an existing value', async () => {
      const key = 'overwrite-key';
      await provider.set(key, 'initial', context);
      await provider.set(key, 'overwritten', context);
      const result = await provider.get(key, context);
      expect(result).toBe('overwritten');
    });

    it('should delete a value and return true', async () => {
      const key = 'delete-key';
      const value = 'to be deleted';
      await provider.set(key, value, context);
      const wasDeleted = await provider.delete(key, context);
      expect(wasDeleted).toBe(true);
      const result = await provider.get(key, context);
      expect(result).toBeNull();
    });

    it('should return false when deleting a non-existent key', async () => {
      const wasDeleted = await provider.delete('non-existent-key', context);
      expect(wasDeleted).toBe(false);
    });

    it('should list keys with a specific prefix', async () => {
      await provider.set('prefix:key1', 1, context);
      await provider.set('prefix:key2', 2, context);
      await provider.set('another:key3', 3, context);

      const keys = await provider.list('prefix:', context);
      expect(keys).toHaveLength(2);
      expect(keys).toContain('prefix:key1');
      expect(keys).toContain('prefix:key2');
    });

    it('should return an empty array when no keys match the prefix', async () => {
      const keys = await provider.list('non-existent-prefix:', context);
      expect(keys).toEqual([]);
    });

    describe('TTL Functionality', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should not return a value if the TTL has expired on get', async () => {
        const key = 'ttl-key-get';
        const value = 'ephemeral';
        await provider.set(key, value, context, { ttl: 1 }); // 1 second TTL

        // Advance time by 2 seconds
        vi.advanceTimersByTime(2000);

        const result = await provider.get(key, context);
        expect(result).toBeNull();
      });

      it('should return a value if the TTL has not expired', async () => {
        const key = 'ttl-key-fresh';
        const value = 'still good';
        await provider.set(key, value, context, { ttl: 5 }); // 5 second TTL

        vi.advanceTimersByTime(2000);

        const result = await provider.get(key, context);
        expect(result).toEqual(value);
      });

      it('should not include expired keys in list (lazy cleanup)', async () => {
        await provider.set('ttl:key1', 1, context, { ttl: 1 });
        await provider.set('ttl:key2', 2, context, { ttl: 5 });

        vi.advanceTimersByTime(2000); // key1 expires

        const keys = await provider.list('ttl:', context);
        expect(keys).toHaveLength(1);
        expect(keys).toContain('ttl:key2');
      });
    });
  });
}
