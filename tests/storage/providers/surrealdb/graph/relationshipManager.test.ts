/**
 * @fileoverview Test suite for SurrealDB relationship manager.
 * @module tests/storage/providers/surrealdb/graph/relationshipManager.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RelationshipManager } from '@/storage/providers/surrealdb/graph/relationshipManager.js';
import { requestContextService } from '@/utils/index.js';
import type { Edge } from '@/storage/providers/surrealdb/graph/graphTypes.js';

describe('RelationshipManager', () => {
  let mockClient: { query: ReturnType<typeof vi.fn> };
  let manager: RelationshipManager;
  let context: ReturnType<typeof requestContextService.createRequestContext>;

  const sampleEdge: Edge = {
    id: 'follows:abc',
    table: 'follows',
    in: 'user:alice',
    out: 'user:bob',
  };

  beforeEach(() => {
    mockClient = { query: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager = new RelationshipManager(mockClient as any);
    context = requestContextService.createRequestContext({
      operation: 'test',
    });
  });

  describe('create', () => {
    it('should create a relationship after checking for duplicates', async () => {
      // First call: exists check returns count 0
      mockClient.query
        .mockResolvedValueOnce([{ result: [{ count: 0 }] }])
        // Second call: RELATE returns edge
        .mockResolvedValueOnce([{ result: [sampleEdge] }]);

      const result = await manager.create(
        'user:alice',
        'follows',
        'user:bob',
        context,
      );

      expect(result).toEqual(sampleEdge);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    it('should throw when duplicate exists and allowDuplicates is false', async () => {
      // exists check returns count > 0
      mockClient.query.mockResolvedValue([{ result: [{ count: 1 }] }]);

      await expect(
        manager.create('user:alice', 'follows', 'user:bob', context),
      ).rejects.toThrow('Relationship already exists');
    });

    it('should skip duplicate check when allowDuplicates is true', async () => {
      mockClient.query.mockResolvedValue([{ result: [sampleEdge] }]);

      const result = await manager.create(
        'user:alice',
        'follows',
        'user:bob',
        context,
        { allowDuplicates: true },
      );

      expect(result).toEqual(sampleEdge);
      // Only RELATE, no exists check
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    it('should include SET clause when data is provided', async () => {
      mockClient.query
        .mockResolvedValueOnce([{ result: [{ count: 0 }] }])
        .mockResolvedValueOnce([{ result: [sampleEdge] }]);

      await manager.create('user:alice', 'follows', 'user:bob', context, {
        data: { weight: 1, since: '2025-01-01' },
      });

      // The RELATE query is the second call
      const relateQuery = mockClient.query.mock.calls[1]![0] as string;
      expect(relateQuery).toContain('SET');
      expect(relateQuery).toContain('weight');
      expect(relateQuery).toContain('since');
    });

    it('should throw when RELATE returns no result', async () => {
      mockClient.query
        .mockResolvedValueOnce([{ result: [{ count: 0 }] }])
        .mockResolvedValueOnce([{ result: [] }]);

      await expect(
        manager.create('user:alice', 'follows', 'user:bob', context),
      ).rejects.toThrow();
    });

    it('should create bidirectional relationship when requested', async () => {
      // exists check for forward
      mockClient.query
        .mockResolvedValueOnce([{ result: [{ count: 0 }] }])
        // RELATE forward
        .mockResolvedValueOnce([{ result: [sampleEdge] }])
        // RELATE reverse (allowDuplicates=true skips exists check)
        .mockResolvedValueOnce([
          {
            result: [
              {
                ...sampleEdge,
                id: 'follows:def',
                in: 'user:bob',
                out: 'user:alice',
              },
            ],
          },
        ]);

      await manager.create('user:alice', 'follows', 'user:bob', context, {
        bidirectional: true,
      });

      // 3 calls: exists + RELATE forward + RELATE reverse
      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('exists', () => {
    it('should return true when relationship exists', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ count: 1 }] }]);

      const result = await manager.exists(
        'user:alice',
        'follows',
        'user:bob',
        context,
      );

      expect(result).toBe(true);
    });

    it('should return false when relationship does not exist', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ count: 0 }] }]);

      const result = await manager.exists(
        'user:alice',
        'follows',
        'user:bob',
        context,
      );

      expect(result).toBe(false);
    });

    it('should handle empty result gracefully', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      const result = await manager.exists(
        'user:alice',
        'follows',
        'user:bob',
        context,
      );

      expect(result).toBe(false);
    });

    it('should query the correct edge table', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ count: 0 }] }]);

      await manager.exists('user:alice', 'knows', 'user:bob', context);

      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('FROM knows');
    });
  });

  describe('updateMetadata', () => {
    it('should update edge metadata', async () => {
      const updatedEdge = { ...sampleEdge, data: { weight: 5 } };
      mockClient.query.mockResolvedValue([{ result: [updatedEdge] }]);

      const result = await manager.updateMetadata(
        'follows:abc',
        { weight: 5 },
        context,
      );

      expect(result).toEqual(updatedEdge);
      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('UPDATE');
      expect(queryStr).toContain('SET');
      expect(queryStr).toContain('weight');
    });

    it('should throw when edge not found', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      await expect(
        manager.updateMetadata('follows:nonexistent', { weight: 1 }, context),
      ).rejects.toThrow('Edge not found');
    });

    it('should handle multiple fields', async () => {
      mockClient.query.mockResolvedValue([{ result: [sampleEdge] }]);

      await manager.updateMetadata(
        'follows:abc',
        { weight: 3, label: 'close', updated: true },
        context,
      );

      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('weight');
      expect(queryStr).toContain('label');
      expect(queryStr).toContain('updated');
    });
  });

  describe('delete', () => {
    it('should delete edge and return true', async () => {
      mockClient.query.mockResolvedValue([{ result: [sampleEdge] }]);

      const result = await manager.delete('follows:abc', context);

      expect(result).toBe(true);
      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('DELETE');
      expect(queryStr).toContain('RETURN BEFORE');
    });

    it('should return false when edge does not exist', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      const result = await manager.delete('follows:nonexistent', context);
      expect(result).toBe(false);
    });
  });

  describe('getAllOfType', () => {
    it('should return all edges of a specific type', async () => {
      const edges = [sampleEdge, { ...sampleEdge, id: 'follows:def' }];
      mockClient.query.mockResolvedValue([{ result: edges }]);

      const result = await manager.getAllOfType('follows', context);

      expect(result).toEqual(edges);
      expect(result).toHaveLength(2);
    });

    it('should apply default limit of 100', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      await manager.getAllOfType('follows', context);

      const params = mockClient.query.mock.calls[0]![1] as Record<
        string,
        unknown
      >;
      expect(params.limit).toBe(100);
    });

    it('should apply custom limit', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      await manager.getAllOfType('follows', context, 25);

      const params = mockClient.query.mock.calls[0]![1] as Record<
        string,
        unknown
      >;
      expect(params.limit).toBe(25);
    });

    it('should return empty array when no edges found', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      const result = await manager.getAllOfType('follows', context);
      expect(result).toEqual([]);
    });

    it('should handle missing result gracefully', async () => {
      mockClient.query.mockResolvedValue([{}]);

      const result = await manager.getAllOfType('follows', context);
      expect(result).toEqual([]);
    });
  });
});
