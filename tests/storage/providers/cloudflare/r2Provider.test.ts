/**
 * @fileoverview Unit tests for the R2Provider.
 * @module tests/storage/providers/cloudflare/r2Provider.test
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { R2Provider } from '../../../../src/storage/providers/cloudflare/r2Provider.js';
import { McpError } from '../../../../src/types-global/errors.js';
import type { RequestContext } from '../../../../src/utils/index.js';
import { requestContextService } from '../../../../src/utils/index.js';

// Mock R2Bucket
const createMockR2Bucket = () => ({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn().mockResolvedValue(undefined),
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
      const envelope = {
        __mcp: { v: 1 },
        value: storedObject,
      };
      const mockR2Object = {
        text: async () => JSON.stringify(envelope),
      };
      mockBucket.get.mockResolvedValue(mockR2Object);
      const result = await r2Provider.get<{ data: string }>(
        'tenant-1',
        'key-1',
        context,
      );
      expect(result).toEqual(storedObject);
    });

    it('should throw McpError on JSON parsing error', async () => {
      const mockR2Object = {
        text: async () => 'invalid-json',
      };
      mockBucket.get.mockResolvedValue(mockR2Object);
      await expect(
        r2Provider.get('tenant-1', 'key-1', context),
      ).rejects.toThrow(McpError);
    });

    it('should delete expired keys and return null', async () => {
      const expiredEnvelope = {
        __mcp: { v: 1, expiresAt: Date.now() - 1_000 },
        value: { data: 'stale' },
      };
      const mockR2Object = {
        text: async () => JSON.stringify(expiredEnvelope),
      };
      mockBucket.get.mockResolvedValue(mockR2Object);

      const result = await r2Provider.get('tenant-1', 'key-1', context);

      expect(result).toBeNull();
      expect(mockBucket.delete).toHaveBeenCalledWith('tenant-1:key-1');
    });
  });

  describe('set', () => {
    it('should call put with the correct key and stringified envelope', async () => {
      const value = { data: 'test-data' };
      const expectedEnvelope = {
        __mcp: { v: 1 },
        value,
      };
      await r2Provider.set('tenant-1', 'key-1', value, context);
      expect(mockBucket.put).toHaveBeenCalledWith(
        'tenant-1:key-1',
        JSON.stringify(expectedEnvelope),
      );
    });

    it('should include a calculated expiresAt in envelope if ttl is provided', async () => {
      const value = { data: 'test' };
      const ttl = 3600;
      const now = Date.now();

      await r2Provider.set('tenant-1', 'key-1', value, context, { ttl });

      expect(mockBucket.put).toHaveBeenCalledTimes(1);
      const [key, body] = mockBucket.put.mock.calls[0]!;
      const envelope = JSON.parse(body);

      expect(key).toBe('tenant-1:key-1');
      expect(envelope.value).toEqual(value);
      expect(envelope.__mcp.v).toBe(1);
      expect(envelope.__mcp.expiresAt).toBeGreaterThanOrEqual(now + ttl * 1000);
      // Allow for a small delay in execution
      expect(envelope.__mcp.expiresAt).toBeLessThan(now + ttl * 1000 + 100);
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
        truncated: false,
      });
      const result = await r2Provider.list('tenant-1', 'key', context);
      expect(result.keys).toEqual(['key-1', 'key-2', 'unrelated-key']);
      expect(result.nextCursor).toBeUndefined();
      expect(mockBucket.list).toHaveBeenCalledWith(
        expect.objectContaining({
          prefix: 'tenant-1:key',
          limit: 1001,
        }),
      );
    });

    it('should apply limit, cursor, and expose next cursor when truncated', async () => {
      const listedResponse = {
        objects: [
          { key: 'tenant-1:key-a' },
          { key: 'tenant-1:key-b' },
          { key: 'tenant-1:key-c' },
        ],
        truncated: true,
        cursor: 'cursor-token',
      };
      mockBucket.list
        .mockResolvedValueOnce(listedResponse)
        .mockResolvedValueOnce({ objects: [], truncated: false });

      const result = await r2Provider.list('tenant-1', 'key', context, {
        limit: 2,
        cursor: 'incoming-cursor',
      });

      expect(result.keys).toEqual(['key-a', 'key-b']);
      expect(result.nextCursor).toBe('cursor-token');
      expect(mockBucket.list).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          prefix: 'tenant-1:key',
          limit: 3,
          cursor: 'incoming-cursor',
        }),
      );
    });
  });

  describe('getMany', () => {
    it('should aggregate non-null values into a map', async () => {
      const spy = vi
        .spyOn(r2Provider, 'get')
        .mockResolvedValueOnce({ payload: 1 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ payload: 3 });

      const result = await r2Provider.getMany(
        'tenant-1',
        ['key-1', 'key-2', 'key-3'],
        context,
      );

      expect(result.size).toBe(2);
      expect(result.get('key-1')).toEqual({ payload: 1 });
      expect(result.get('key-3')).toEqual({ payload: 3 });
      expect(result.has('key-2')).toBe(false);
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

  describe('setMany', () => {
    it('should delegate to set for each entry and preserve options', async () => {
      const spy = vi.spyOn(r2Provider, 'set').mockResolvedValue();
      const entries = new Map<string, unknown>([
        ['key-1', { data: 1 }],
        ['key-2', { data: 2 }],
      ]);

      await r2Provider.setMany('tenant-1', entries, context, { ttl: 10 });

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(
        1,
        'tenant-1',
        'key-1',
        { data: 1 },
        context,
        { ttl: 10 },
      );
      expect(spy).toHaveBeenNthCalledWith(
        2,
        'tenant-1',
        'key-2',
        { data: 2 },
        context,
        { ttl: 10 },
      );
    });
  });

  describe('deleteMany', () => {
    it('should count only successfully deleted keys', async () => {
      const spy = vi
        .spyOn(r2Provider, 'delete')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const count = await r2Provider.deleteMany(
        'tenant-1',
        ['key-1', 'key-2', 'key-3'],
        context,
      );

      expect(count).toBe(2);
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

  describe('clear', () => {
    it('should iterate through pages and delete all keys for a tenant', async () => {
      mockBucket.list
        .mockResolvedValueOnce({
          objects: [{ key: 'tenant-1:key-1' }, { key: 'tenant-1:key-2' }],
          truncated: true,
          cursor: 'cursor-token',
        })
        .mockResolvedValueOnce({
          objects: [{ key: 'tenant-1:key-3' }],
          truncated: false,
        });

      const deletedCount = await r2Provider.clear('tenant-1', context);

      expect(deletedCount).toBe(3);
      expect(mockBucket.delete).toHaveBeenCalledTimes(3);
      expect(mockBucket.list).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ prefix: 'tenant-1:' }),
      );
      expect(mockBucket.list).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ cursor: 'cursor-token' }),
      );
    });
  });
});
