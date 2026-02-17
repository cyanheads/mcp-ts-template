/**
 * @fileoverview Test suite for SurrealDB graph operations.
 * @module tests/storage/providers/surrealdb/graph/graphOperations.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GraphOperations } from '@/storage/providers/surrealdb/graph/graphOperations.js';
import { requestContextService } from '@/utils/index.js';
import type { Edge } from '@/storage/providers/surrealdb/graph/graphTypes.js';

describe('GraphOperations', () => {
  let mockClient: { query: ReturnType<typeof vi.fn> };
  let graphOps: GraphOperations;
  let context: ReturnType<typeof requestContextService.createRequestContext>;

  beforeEach(() => {
    mockClient = { query: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graphOps = new GraphOperations(mockClient as any);
    context = requestContextService.createRequestContext({
      operation: 'test',
    });
  });

  describe('createEdge', () => {
    it('should create an edge with data', async () => {
      const edge: Edge = {
        id: 'follows:abc',
        table: 'follows',
        in: 'user:alice',
        out: 'user:bob',
      };
      mockClient.query.mockResolvedValue([{ result: [edge] }]);

      const result = await graphOps.createEdge(
        'user:alice',
        'follows',
        'user:bob',
        { since: '2025-01-01' },
        context,
      );

      expect(result).toEqual(edge);
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('RELATE');
      expect(queryStr).toContain('follows');
      expect(queryStr).toContain('SET');
      expect(queryStr).toContain('since');
    });

    it('should create an edge without data', async () => {
      const edge: Edge = {
        id: 'follows:abc',
        table: 'follows',
        in: 'user:alice',
        out: 'user:bob',
      };
      mockClient.query.mockResolvedValue([{ result: [edge] }]);

      const result = await graphOps.createEdge(
        'user:alice',
        'follows',
        'user:bob',
        {},
        context,
      );

      expect(result).toEqual(edge);
      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).not.toContain('SET');
    });

    it('should throw when edge creation returns no result', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      await expect(
        graphOps.createEdge('user:alice', 'follows', 'user:bob', {}, context),
      ).rejects.toThrow();
    });

    it('should propagate client errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Connection lost'));

      await expect(
        graphOps.createEdge('user:alice', 'follows', 'user:bob', {}, context),
      ).rejects.toThrow();
    });
  });

  describe('traverseOut', () => {
    it('should traverse outward one hop by default', async () => {
      const vertices = [{ id: 'user:bob', table: 'user', data: {} }];
      mockClient.query.mockResolvedValue([
        { result: [{ connections: vertices }] },
      ]);

      const result = await graphOps.traverseOut('user:alice', context);

      expect(result).toEqual(vertices);
      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('->');
    });

    it('should traverse multiple hops', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ connections: [] }] }]);

      await graphOps.traverseOut('user:alice', context, 3);

      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('->->->');
    });

    it('should apply edge filter when provided', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ connections: [] }] }]);

      await graphOps.traverseOut('user:alice', context, 1, 'follows');

      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain("meta::tb(id) = 'follows'");
    });

    it('should return empty array when no connections found', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ connections: [] }] }]);

      const result = await graphOps.traverseOut('user:alice', context);
      expect(result).toEqual([]);
    });

    it('should wrap non-array connections in an array', async () => {
      const vertex = { id: 'user:bob', table: 'user', data: {} };
      mockClient.query.mockResolvedValue([
        { result: [{ connections: vertex }] },
      ]);

      const result = await graphOps.traverseOut('user:alice', context);
      expect(result).toEqual([vertex]);
    });
  });

  describe('traverseIn', () => {
    it('should traverse inward with <- operator', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ connections: [] }] }]);

      await graphOps.traverseIn('user:bob', context, 1);

      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('<-');
      expect(queryStr).not.toContain('->');
    });

    it('should apply edge filter for inward traversal', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ connections: [] }] }]);

      await graphOps.traverseIn('user:bob', context, 1, 'follows');

      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain("meta::tb(id) = 'follows'");
    });

    it('should handle multi-hop inward traversal', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ connections: [] }] }]);

      await graphOps.traverseIn('user:bob', context, 2);

      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('<-<-');
    });
  });

  describe('traverseBoth', () => {
    it('should traverse bidirectionally with <-> operator', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ connections: [] }] }]);

      await graphOps.traverseBoth('user:alice', context, 1);

      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('<->');
    });

    it('should support multi-hop bidirectional traversal', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ connections: [] }] }]);

      await graphOps.traverseBoth('user:alice', context, 2);

      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('<-><->');
    });
  });

  describe('deleteEdge', () => {
    it('should delete an edge and return true', async () => {
      const edge: Edge = {
        id: 'follows:abc',
        table: 'follows',
        in: 'user:alice',
        out: 'user:bob',
      };
      mockClient.query.mockResolvedValue([{ result: [edge] }]);

      const result = await graphOps.deleteEdge('follows:abc', context);

      expect(result).toBe(true);
      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('DELETE');
      expect(queryStr).toContain('RETURN BEFORE');
    });

    it('should return false when edge does not exist', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      const result = await graphOps.deleteEdge('follows:nonexistent', context);
      expect(result).toBe(false);
    });
  });
});
