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
  });
});
