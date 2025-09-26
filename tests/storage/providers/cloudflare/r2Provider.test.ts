/**
 * @fileoverview Unit tests for the R2Provider.
 * @module tests/storage/providers/cloudflare/r2Provider.test
 */
import { R2Provider } from '../../../../src/storage/providers/cloudflare/r2Provider.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '../../../../src/utils/index.js';
import { requestContextService } from '../../../../src/utils/index.js';
import { logger } from '../../../../src/utils/index.js';

// Mock R2Bucket
const createMockR2Bucket = () => ({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  head: vi.fn(),
});

describe('R2Provider', () => {
  let r2Provider: R2Provider;
  let mockBucket: ReturnType<typeof createMockR2Bucket>;
  let context: RequestContext;

  beforeEach(() => {
    mockBucket = createMockR2Bucket();
    r2Provider = new R2Provider(mockBucket as any);
    context = requestContextService.createRequestContext({
      operation: 'test-r2-provider',
    });
  });

  describe('get', () => {
    it('should return null if object not found', async () => {
      mockBucket.get.mockResolvedValue(null);
      const result = await r2Provider.get('tenant-1', 'key-1', context);
      expect(result).toBeNull();
      expect(mockBucket.get).toHaveBeenCalledWith('tenant-1:key-1');
    });

    it('should return parsed JSON object if found', async () => {
      const storedObject = { data: 'test-data' };
      const mockR2Object = {
        json: async () => storedObject,
      };
      mockBucket.get.mockResolvedValue(mockR2Object);
      const result = await r2Provider.get<{ data: string }>(
        'tenant-1',
        'key-1',
        context,
      );
      expect(result).toEqual(storedObject);
    });

    it('should return null on JSON parsing error', async () => {
      const mockR2Object = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      };
      mockBucket.get.mockResolvedValue(mockR2Object);
      const result = await r2Provider.get('tenant-1', 'key-1', context);
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should call put with the correct key and stringified value', async () => {
      const value = { data: 'test-data' };
      await r2Provider.set('tenant-1', 'key-1', value, context);
      expect(mockBucket.put).toHaveBeenCalledWith(
        'tenant-1:key-1',
        JSON.stringify(value),
        {},
      );
    });

    it('should ignore TTL option and log a warning', async () => {
      const value = { data: 'test' };
      const loggerSpy = vi.spyOn(logger, 'warning');
      await r2Provider.set('tenant-1', 'key-1', value, context, { ttl: 3600 });
      expect(loggerSpy).toHaveBeenCalledWith(
        "[R2Provider] TTL is not natively supported by R2. The 'ttl' option for key 'tenant-1:key-1' will be ignored.",
        context,
      );
      expect(mockBucket.put).toHaveBeenCalledWith(
        'tenant-1:key-1',
        JSON.stringify(value),
        {},
      );
    });
  });

  describe('delete', () => {
    it('should return false if key does not exist', async () => {
      mockBucket.head.mockResolvedValue(null);
      const result = await r2Provider.delete('tenant-1', 'key-1', context);
      expect(result).toBe(false);
      expect(mockBucket.delete).not.toHaveBeenCalled();
    });

    it('should return true and call delete if key exists', async () => {
      mockBucket.head.mockResolvedValue({}); // Mock a non-null response
      const result = await r2Provider.delete('tenant-1', 'key-1', context);
      expect(result).toBe(true);
      expect(mockBucket.delete).toHaveBeenCalledWith('tenant-1:key-1');
    });
  });

  describe('list', () => {
    it('should return a list of keys with tenant prefix stripped', async () => {
      mockBucket.list.mockResolvedValue({
        objects: [
          { key: 'tenant-1:key-1' },
          { key: 'tenant-1:key-2' },
          { key: 'unrelated-key' },
        ],
      });
      const result = await r2Provider.list('tenant-1', 'key', context);
      expect(result).toEqual(['key-1', 'key-2', 'unrelated-key']);
      expect(mockBucket.list).toHaveBeenCalledWith({
        prefix: 'tenant-1:key',
      });
    });
  });
});
