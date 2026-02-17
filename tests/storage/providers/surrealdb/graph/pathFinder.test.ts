/**
 * @fileoverview Test suite for SurrealDB path finder.
 * @module tests/storage/providers/surrealdb/graph/pathFinder.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PathFinder } from '@/storage/providers/surrealdb/graph/pathFinder.js';
import type {
  Path,
  PathFindingOptions,
} from '@/storage/providers/surrealdb/graph/pathFinder.js';
import { requestContextService } from '@/utils/index.js';

describe('PathFinder', () => {
  let mockClient: { query: ReturnType<typeof vi.fn> };
  let pathFinder: PathFinder;
  let context: ReturnType<typeof requestContextService.createRequestContext>;

  beforeEach(() => {
    mockClient = { query: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pathFinder = new PathFinder(mockClient as any);
    context = requestContextService.createRequestContext({
      operation: 'test',
    });
  });

  describe('shortestPath', () => {
    it('should return a path when target is reachable', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: [
            { id: 'user:alice', reachable: ['user:bob', 'user:charlie'] },
          ],
        },
      ]);

      const result = await pathFinder.shortestPath(
        'user:alice',
        'user:charlie',
        context,
      );

      expect(result).toBeDefined();
      expect(result).toEqual<Path>({
        vertices: [],
        edges: [],
        weight: 0,
      });
    });

    it('should return null when no data is found', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      const result = await pathFinder.shortestPath(
        'user:alice',
        'user:unknown',
        context,
      );

      expect(result).toBeNull();
    });

    it('should use default maxLength of 10', async () => {
      mockClient.query.mockResolvedValue([
        { result: [{ id: 'user:alice', reachable: [] }] },
      ]);

      await pathFinder.shortestPath('user:alice', 'user:bob', context);

      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      // 10 hops = 10 '->' operators
      const arrowCount = (queryStr.match(/->/g) ?? []).length;
      expect(arrowCount).toBe(10);
    });

    it('should respect custom maxLength option', async () => {
      const options: PathFindingOptions = { maxLength: 3 };
      mockClient.query.mockResolvedValue([
        { result: [{ id: 'user:alice', reachable: [] }] },
      ]);

      await pathFinder.shortestPath('user:alice', 'user:bob', context, options);

      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      const arrowCount = (queryStr.match(/->/g) ?? []).length;
      expect(arrowCount).toBe(3);
    });

    it('should propagate client errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Query timeout'));

      await expect(
        pathFinder.shortestPath('user:alice', 'user:bob', context),
      ).rejects.toThrow();
    });
  });

  describe('findAllPaths', () => {
    it('should query for paths between vertices', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      const result = await pathFinder.findAllPaths(
        'user:alice',
        'user:charlie',
        context,
      );

      expect(result).toEqual([]);
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    it('should pass maxPaths parameter', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      await pathFinder.findAllPaths('user:alice', 'user:bob', context, 5);

      const params = mockClient.query.mock.calls[0]![1] as Record<
        string,
        unknown
      >;
      expect(params.maxPaths).toBe(5);
    });

    it('should default maxPaths to 10', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      await pathFinder.findAllPaths('user:alice', 'user:bob', context);

      const params = mockClient.query.mock.calls[0]![1] as Record<
        string,
        unknown
      >;
      expect(params.maxPaths).toBe(10);
    });
  });

  describe('detectCycle', () => {
    it('should return true when cycle exists', async () => {
      mockClient.query.mockResolvedValue([
        { result: [{ reachable: ['user:bob', 'user:alice'] }] },
      ]);

      const result = await pathFinder.detectCycle('user:alice', context);
      expect(result).toBe(true);
    });

    it('should return false when no cycle exists', async () => {
      mockClient.query.mockResolvedValue([
        { result: [{ reachable: ['user:bob', 'user:charlie'] }] },
      ]);

      const result = await pathFinder.detectCycle('user:alice', context);
      expect(result).toBe(false);
    });

    it('should return false when reachable is empty', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ reachable: [] }] }]);

      const result = await pathFinder.detectCycle('user:alice', context);
      expect(result).toBe(false);
    });

    it('should use default maxDepth of 10', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ reachable: [] }] }]);

      await pathFinder.detectCycle('user:alice', context);

      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      const arrowCount = (queryStr.match(/->/g) ?? []).length;
      expect(arrowCount).toBe(10);
    });

    it('should respect custom maxDepth', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ reachable: [] }] }]);

      await pathFinder.detectCycle('user:alice', context, 5);

      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      const arrowCount = (queryStr.match(/->/g) ?? []).length;
      expect(arrowCount).toBe(5);
    });

    it('should handle null result gracefully', async () => {
      mockClient.query.mockResolvedValue([{ result: [{}] }]);

      const result = await pathFinder.detectCycle('user:alice', context);
      expect(result).toBe(false);
    });
  });

  describe('getDegree', () => {
    it('should return in-degree, out-degree, and total', async () => {
      mockClient.query.mockResolvedValue([
        { result: [{ in_degree: 3, out_degree: 5 }] },
      ]);

      const result = await pathFinder.getDegree('user:alice', context);

      expect(result).toEqual({
        inDegree: 3,
        outDegree: 5,
        totalDegree: 8,
      });
    });

    it('should default to 0 when no data returned', async () => {
      mockClient.query.mockResolvedValue([{ result: [{}] }]);

      const result = await pathFinder.getDegree('user:alice', context);

      expect(result).toEqual({
        inDegree: 0,
        outDegree: 0,
        totalDegree: 0,
      });
    });

    it('should handle missing result array', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      const result = await pathFinder.getDegree('user:alice', context);

      expect(result).toEqual({
        inDegree: 0,
        outDegree: 0,
        totalDegree: 0,
      });
    });

    it('should query with the vertex ID', async () => {
      mockClient.query.mockResolvedValue([
        { result: [{ in_degree: 0, out_degree: 0 }] },
      ]);

      await pathFinder.getDegree('user:alice', context);

      const params = mockClient.query.mock.calls[0]![1] as Record<
        string,
        unknown
      >;
      expect(params.vertexId).toBe('user:alice');
    });
  });
});
