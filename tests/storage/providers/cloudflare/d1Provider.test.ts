/**
 * @fileoverview Unit tests for the D1Provider.
 * @module tests/storage/providers/cloudflare/d1Provider.test
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { D1Provider } from '../../../../src/storage/providers/cloudflare/d1Provider.js';
import { McpError } from '../../../../src/types-global/errors.js';
import type { RequestContext } from '../../../../src/utils/index.js';
import { requestContextService } from '../../../../src/utils/index.js';

// Mock D1Database
const createMockD1Database = () => ({
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnValue({
      first: vi.fn(),
      run: vi.fn(),
      all: vi.fn(),
    }),
  }),
  batch: vi.fn(),
});

describe('D1Provider', () => {
  let d1Provider: D1Provider;
  let mockDb: ReturnType<typeof createMockD1Database>;
  let context: RequestContext;

  beforeEach(() => {
    mockDb = createMockD1Database();
    d1Provider = new D1Provider(mockDb as any);
    context = requestContextService.createRequestContext({
      operation: 'test-d1-provider',
    });
  });

  describe('constructor', () => {
    it('should throw McpError when db is not provided', () => {
      expect(() => new D1Provider(null as any)).toThrow(McpError);
      expect(() => new D1Provider(null as any)).toThrow(
        /D1Provider requires a valid D1Database instance/,
      );
    });

    it('should accept valid table names', () => {
      expect(() => new D1Provider(mockDb as any, 'kv_store')).not.toThrow();
      expect(() => new D1Provider(mockDb as any, '_private')).not.toThrow();
      expect(() => new D1Provider(mockDb as any, 'Table1')).not.toThrow();
      expect(() => new D1Provider(mockDb as any, 'a'.repeat(64))).not.toThrow();
    });

    it('should reject invalid table names (SQL injection prevention)', () => {
      // Starts with number
      expect(() => new D1Provider(mockDb as any, '1table')).toThrow(McpError);
      expect(() => new D1Provider(mockDb as any, '1table')).toThrow(
        /valid SQL identifier/,
      );

      // Contains special characters
      expect(() => new D1Provider(mockDb as any, 'table; DROP TABLE')).toThrow(
        McpError,
      );
      expect(() => new D1Provider(mockDb as any, "table' OR 1=1")).toThrow(
        McpError,
      );
      expect(() => new D1Provider(mockDb as any, 'table-name')).toThrow(
        McpError,
      );
      expect(() => new D1Provider(mockDb as any, 'table.name')).toThrow(
        McpError,
      );

      // Empty string
      expect(() => new D1Provider(mockDb as any, '')).toThrow(McpError);

      // Too long (65 chars)
      expect(() => new D1Provider(mockDb as any, 'a'.repeat(65))).toThrow(
        McpError,
      );
    });
  });

  describe('get', () => {
    it('should return null if key not found', async () => {
      const stmt = mockDb.prepare().bind();
      stmt.first.mockResolvedValue(null);

      const result = await d1Provider.get('tenant-1', 'key-1', context);
      expect(result).toBeNull();
    });

    it('should return parsed JSON value if found and not expired', async () => {
      const stmt = mockDb.prepare().bind();
      stmt.first.mockResolvedValue({
        value: JSON.stringify({ data: 'test' }),
        expires_at: null,
      });

      const result = await d1Provider.get<{ data: string }>(
        'tenant-1',
        'key-1',
        context,
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null and lazy-delete expired entries', async () => {
      const stmt = mockDb.prepare().bind();
      stmt.first.mockResolvedValue({
        value: JSON.stringify({ data: 'stale' }),
        expires_at: Date.now() - 1000,
      });
      stmt.run.mockResolvedValue({ meta: { changes: 1 } });

      const result = await d1Provider.get('tenant-1', 'key-1', context);
      expect(result).toBeNull();
    });

    it('should throw McpError on JSON parse failure', async () => {
      const stmt = mockDb.prepare().bind();
      stmt.first.mockResolvedValue({
        value: 'invalid-json{{{',
        expires_at: null,
      });

      await expect(
        d1Provider.get('tenant-1', 'key-1', context),
      ).rejects.toThrow(McpError);
    });
  });

  describe('set', () => {
    it('should call run with correct parameters', async () => {
      const stmt = mockDb.prepare().bind();
      stmt.run.mockResolvedValue({ meta: { changes: 1 } });

      await d1Provider.set('tenant-1', 'key-1', { data: 'test' }, context);

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should include expires_at when TTL is provided', async () => {
      const stmt = mockDb.prepare().bind();
      stmt.run.mockResolvedValue({ meta: { changes: 1 } });

      await d1Provider.set('tenant-1', 'key-1', { data: 'test' }, context, {
        ttl: 3600,
      });

      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should return true if row was deleted', async () => {
      const stmt = mockDb.prepare().bind();
      stmt.run.mockResolvedValue({ meta: { changes: 1 } });

      const result = await d1Provider.delete('tenant-1', 'key-1', context);
      expect(result).toBe(true);
    });

    it('should return false if row did not exist', async () => {
      const stmt = mockDb.prepare().bind();
      stmt.run.mockResolvedValue({ meta: { changes: 0 } });

      const result = await d1Provider.delete('tenant-1', 'key-1', context);
      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('should return keys matching prefix with pagination', async () => {
      const stmt = mockDb.prepare().bind();
      stmt.all.mockResolvedValue({
        results: [{ key: 'key-1' }, { key: 'key-2' }],
      });

      const result = await d1Provider.list('tenant-1', 'key', context, {
        limit: 10,
      });

      expect(result.keys).toEqual(['key-1', 'key-2']);
      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe('batch operations', () => {
    it('setMany should use D1 batch API', async () => {
      mockDb.batch.mockResolvedValue([]);

      const entries = new Map<string, unknown>([
        ['k1', { data: 1 }],
        ['k2', { data: 2 }],
      ]);

      await d1Provider.setMany('tenant-1', entries, context);

      expect(mockDb.batch).toHaveBeenCalledTimes(1);
    });

    it('setMany should be a no-op for empty entries', async () => {
      await d1Provider.setMany('tenant-1', new Map(), context);

      expect(mockDb.batch).not.toHaveBeenCalled();
    });

    it('deleteMany should use D1 batch API and return count', async () => {
      mockDb.batch.mockResolvedValue([
        { meta: { changes: 1 } },
        { meta: { changes: 1 } },
        { meta: { changes: 0 } },
      ]);

      const count = await d1Provider.deleteMany(
        'tenant-1',
        ['k1', 'k2', 'k3'],
        context,
      );

      expect(count).toBe(2);
      expect(mockDb.batch).toHaveBeenCalledTimes(1);
    });

    it('deleteMany should return 0 for empty keys', async () => {
      const count = await d1Provider.deleteMany('tenant-1', [], context);
      expect(count).toBe(0);
      expect(mockDb.batch).not.toHaveBeenCalled();
    });

    it('getMany should return 0 entries for empty keys', async () => {
      const result = await d1Provider.getMany('tenant-1', [], context);
      expect(result.size).toBe(0);
    });
  });

  describe('clear', () => {
    it('should delete all keys for tenant and return count', async () => {
      const stmt = mockDb.prepare().bind();
      stmt.run.mockResolvedValue({ meta: { changes: 5 } });

      const count = await d1Provider.clear('tenant-1', context);
      expect(count).toBe(5);
    });
  });
});
