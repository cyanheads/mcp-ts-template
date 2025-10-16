/**
 * @fileoverview Test suite for SurrealGraphProvider.
 * Tests SurrealDB graph operations with mocked client.
 * @module tests/services/graph/providers/surrealGraph.provider.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { container } from 'tsyringe';
import { SurrealGraphProvider } from '@/services/graph/providers/surrealGraph.provider.js';
import { SurrealdbClient } from '@/container/tokens.js';
import { JsonRpcErrorCode } from '@/types-global/errors.js';
import { requestContextService } from '@/utils/index.js';
import type { RequestContext } from '@/utils/index.js';
import type { Edge } from '@/services/graph/core/IGraphProvider.js';

// Mock Surreal client
const createMockSurrealClient = () => ({
  query: vi.fn(),
});

describe('SurrealGraphProvider', () => {
  let provider: SurrealGraphProvider;
  let mockClient: ReturnType<typeof createMockSurrealClient>;
  let context: RequestContext;

  beforeEach(() => {
    // Clear and setup container
    container.clearInstances();
    mockClient = createMockSurrealClient();
    container.registerInstance(SurrealdbClient, mockClient as any);

    provider = container.resolve(SurrealGraphProvider);
    context = requestContextService.createRequestContext({
      operation: 'test-surreal-graph',
    });
  });

  describe('Constructor', () => {
    it('should initialize with name', () => {
      expect(provider.name).toBe('surrealdb-graph');
    });

    it('should be injectable', () => {
      expect(provider).toBeInstanceOf(SurrealGraphProvider);
    });
  });

  describe('relate', () => {
    it('should create edge successfully', async () => {
      const mockEdge: Edge = {
        id: 'follows:abc123',
        table: 'follows',
        from: 'user:alice',
        to: 'user:bob',
        data: {},
      };

      mockClient.query.mockResolvedValue([{ result: [mockEdge] }]);

      const result = await provider.relate(
        'user:alice',
        'follows',
        'user:bob',
        context,
      );

      expect(result).toEqual(mockEdge);
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should include edge data in query', async () => {
      const mockEdge: Edge = {
        id: 'follows:abc123',
        table: 'follows',
        from: 'user:alice',
        to: 'user:bob',
        data: { since: '2025-01-01', weight: 1.5 },
      };

      mockClient.query.mockResolvedValue([{ result: [mockEdge] }]);

      const options = {
        data: { since: '2025-01-01', weight: 1.5 },
      };

      const result = await provider.relate(
        'user:alice',
        'follows',
        'user:bob',
        context,
        options,
      );

      expect(result).toEqual(mockEdge);

      // Verify query was called with parameters
      const callArgs = mockClient.query.mock.calls[0];
      if (!callArgs) throw new Error('Expected query to be called');
      const [query, params] = callArgs;
      expect(query).toContain('RELATE');
      expect(query).toContain('follows');
      expect(params).toMatchObject({
        from: 'user:alice',
        to: 'user:bob',
        since: '2025-01-01',
        weight: 1.5,
      });
    });

    it('should handle relate without data', async () => {
      const mockEdge: Edge = {
        id: 'follows:abc123',
        table: 'follows',
        from: 'user:alice',
        to: 'user:bob',
        data: {},
      };

      mockClient.query.mockResolvedValue([{ result: [mockEdge] }]);

      const result = await provider.relate(
        'user:alice',
        'follows',
        'user:bob',
        context,
      );

      expect(result).toEqual(mockEdge);
    });

    it('should throw error when edge creation fails', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      await expect(
        provider.relate('user:alice', 'follows', 'user:bob', context),
      ).rejects.toMatchObject({
        code: JsonRpcErrorCode.InternalError,
        message: 'Failed to create relationship',
      });
    });

    it('should throw error on query failure', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(
        provider.relate('user:alice', 'follows', 'user:bob', context),
      ).rejects.toThrow();
    });
  });

  describe('unrelate', () => {
    it('should delete edge successfully', async () => {
      const mockEdge: Edge = {
        id: 'follows:abc123',
        table: 'follows',
        from: 'user:alice',
        to: 'user:bob',
        data: {},
      };

      mockClient.query.mockResolvedValue([{ result: [mockEdge] }]);

      const result = await provider.unrelate('follows:abc123', context);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should return false when edge not found', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      const result = await provider.unrelate('follows:nonexistent', context);

      expect(result).toBe(false);
    });

    it('should handle query with edgeId parameter', async () => {
      mockClient.query.mockResolvedValue([{ result: [{}] }]);

      await provider.unrelate('follows:abc123', context);

      const callArgs = mockClient.query.mock.calls[0];
      if (!callArgs) throw new Error('Expected query to be called');
      const [query, params] = callArgs;
      expect(query).toContain('DELETE');
      expect(params).toMatchObject({ edgeId: 'follows:abc123' });
    });

    it('should throw error on query failure', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(
        provider.unrelate('follows:abc123', context),
      ).rejects.toThrow();
    });
  });

  describe('traverse', () => {
    it('should traverse graph successfully', async () => {
      const mockData = {
        startNode: { id: 'user:alice' },
        paths: [{ id: 'user:bob' }],
      };

      mockClient.query.mockResolvedValue([{ result: [mockData] }]);

      const result = await provider.traverse('user:alice', context);

      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('paths');
      expect(result.start.id).toBe('user:alice');
    });

    it('should use default options', async () => {
      mockClient.query.mockResolvedValue([
        { result: [{ startNode: { id: 'user:alice' }, paths: [] }] },
      ]);

      await provider.traverse('user:alice', context);

      const callArgs = mockClient.query.mock.calls[0];
      if (!callArgs) throw new Error('Expected query to be called');
      const [query] = callArgs;
      expect(query).toContain('->'); // Default 'out' direction
    });

    it('should respect maxDepth option', async () => {
      mockClient.query.mockResolvedValue([
        { result: [{ startNode: { id: 'user:alice' }, paths: [] }] },
      ]);

      await provider.traverse('user:alice', context, { maxDepth: 3 });

      const callArgs = mockClient.query.mock.calls[0];
      if (!callArgs) throw new Error('Expected query to be called');
      const [query] = callArgs;
      expect(query).toContain('->'); // Repeated for depth
    });

    it('should respect direction option', async () => {
      mockClient.query.mockResolvedValue([
        { result: [{ startNode: { id: 'user:alice' }, paths: [] }] },
      ]);

      await provider.traverse('user:alice', context, { direction: 'in' });

      const callArgs = mockClient.query.mock.calls[0];
      if (!callArgs) throw new Error('Expected query to be called');
      const [query] = callArgs;
      expect(query).toContain('<-'); // Incoming direction
    });

    it('should handle both direction', async () => {
      mockClient.query.mockResolvedValue([
        { result: [{ startNode: { id: 'user:alice' }, paths: [] }] },
      ]);

      await provider.traverse('user:alice', context, { direction: 'both' });

      const callArgs = mockClient.query.mock.calls[0];
      if (!callArgs) throw new Error('Expected query to be called');
      const [query] = callArgs;
      expect(query).toContain('<->'); // Both directions
    });

    it('should include WHERE clause when provided', async () => {
      mockClient.query.mockResolvedValue([
        { result: [{ startNode: { id: 'user:alice' }, paths: [] }] },
      ]);

      await provider.traverse('user:alice', context, {
        where: 'age > 18',
      });

      const callArgs = mockClient.query.mock.calls[0];
      if (!callArgs) throw new Error('Expected query to be called');
      const [query] = callArgs;
      expect(query).toContain('WHERE');
    });

    it('should throw error when vertex not found', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      await expect(
        provider.traverse('user:nonexistent', context),
      ).rejects.toMatchObject({
        code: JsonRpcErrorCode.InvalidParams,
      });
    });

    it('should throw error on query failure', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(provider.traverse('user:alice', context)).rejects.toThrow();
    });
  });

  describe('shortestPath', () => {
    it('should find shortest path when exists', async () => {
      const mockPath = [
        { id: 'user:alice' },
        { id: 'follows:1', in: 'user:bob', out: 'user:alice' },
        { id: 'user:bob' },
      ];
      mockClient.query.mockResolvedValue([{ result: [{ path: mockPath }] }]);

      const result = await provider.shortestPath(
        'user:alice',
        'user:bob',
        context,
      );

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('vertices');
      expect(result).toHaveProperty('edges');
      expect(result?.vertices.length).toBeGreaterThan(0);
    });

    it('should return null when no path exists', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ path: null }] }]);

      const result = await provider.shortestPath(
        'user:alice',
        'user:charlie',
        context,
      );

      expect(result).toBeNull();
    });

    it('should handle empty result set', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      const result = await provider.shortestPath(
        'user:alice',
        'user:bob',
        context,
      );

      expect(result).toBeNull();
    });

    it('should use native graph::shortest_path function', async () => {
      const mockPath = [{ id: 'user:alice' }, { id: 'user:bob' }];
      mockClient.query.mockResolvedValue([{ result: [{ path: mockPath }] }]);

      await provider.shortestPath('user:alice', 'user:bob', context);

      const callArgs = mockClient.query.mock.calls[0];
      if (!callArgs) throw new Error('Expected query to be called');
      const [query] = callArgs;
      expect(query).toContain('graph::shortest_path'); // Uses native function
    });

    it('should throw error on query failure', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(
        provider.shortestPath('user:alice', 'user:bob', context),
      ).rejects.toThrow();
    });
  });

  describe('getOutgoingEdges', () => {
    it('should retrieve outgoing edges', async () => {
      const mockEdges: Edge[] = [
        {
          id: 'follows:1',
          table: 'follows',
          from: 'user:alice',
          to: 'user:bob',
          data: {},
        },
      ];

      mockClient.query.mockResolvedValue([{ result: [{ edges: mockEdges }] }]);

      const result = await provider.getOutgoingEdges('user:alice', context);

      expect(result).toEqual(mockEdges);
    });

    it('should return empty array when no edges', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ edges: [] }] }]);

      const result = await provider.getOutgoingEdges('user:alice', context);

      expect(result).toEqual([]);
    });

    it('should handle missing edges property', async () => {
      mockClient.query.mockResolvedValue([{ result: [{}] }]);

      const result = await provider.getOutgoingEdges('user:alice', context);

      expect(result).toEqual([]);
    });

    it('should use outgoing operator in query', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ edges: [] }] }]);

      await provider.getOutgoingEdges('user:alice', context);

      const callArgs = mockClient.query.mock.calls[0];
      if (!callArgs) throw new Error('Expected query to be called');
      const [query] = callArgs;
      expect(query).toContain('->'); // Outgoing operator
    });

    it('should throw error on query failure', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(
        provider.getOutgoingEdges('user:alice', context),
      ).rejects.toThrow();
    });
  });

  describe('getIncomingEdges', () => {
    it('should retrieve incoming edges', async () => {
      const mockEdges: Edge[] = [
        {
          id: 'follows:1',
          table: 'follows',
          from: 'user:bob',
          to: 'user:alice',
          data: {},
        },
      ];

      mockClient.query.mockResolvedValue([{ result: [{ edges: mockEdges }] }]);

      const result = await provider.getIncomingEdges('user:alice', context);

      expect(result).toEqual(mockEdges);
    });

    it('should return empty array when no edges', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ edges: [] }] }]);

      const result = await provider.getIncomingEdges('user:alice', context);

      expect(result).toEqual([]);
    });

    it('should handle missing edges property', async () => {
      mockClient.query.mockResolvedValue([{ result: [{}] }]);

      const result = await provider.getIncomingEdges('user:alice', context);

      expect(result).toEqual([]);
    });

    it('should use incoming operator in query', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ edges: [] }] }]);

      await provider.getIncomingEdges('user:alice', context);

      const callArgs = mockClient.query.mock.calls[0];
      if (!callArgs) throw new Error('Expected query to be called');
      const [query] = callArgs;
      expect(query).toContain('<-'); // Incoming operator
    });

    it('should throw error on query failure', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(
        provider.getIncomingEdges('user:alice', context),
      ).rejects.toThrow();
    });
  });

  describe('pathExists', () => {
    it('should return true when path exists', async () => {
      // Mock graph::shortest_path to return a path with length <= maxDepth * 2 + 1
      const mockPath = [{ id: 'user:alice' }, { id: 'user:bob' }]; // 2 elements <= 5*2+1
      mockClient.query.mockResolvedValue([{ result: [{ path: mockPath }] }]);

      const result = await provider.pathExists(
        'user:alice',
        'user:bob',
        context,
      );

      expect(result).toBe(true);
    });

    it('should return false when no path exists', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ path: null }] }]);

      const result = await provider.pathExists(
        'user:alice',
        'user:charlie',
        context,
      );

      expect(result).toBe(false);
    });

    it('should use default maxDepth of 5', async () => {
      const mockPath = [{ id: 'user:alice' }];
      mockClient.query.mockResolvedValue([{ result: [{ path: mockPath }] }]);

      await provider.pathExists('user:alice', 'user:bob', context);

      // Should use graph::shortest_path
      expect(mockClient.query).toHaveBeenCalled();
      const callArgs = mockClient.query.mock.calls[0];
      if (!callArgs) throw new Error('Expected query to be called');
      const [query] = callArgs;
      expect(query).toContain('graph::shortest_path');
    });

    it('should use custom maxDepth', async () => {
      const mockPath = [{ id: 'user:alice' }];
      mockClient.query.mockResolvedValue([{ result: [{ path: mockPath }] }]);

      await provider.pathExists('user:alice', 'user:bob', context, 10);

      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should throw error on query failure', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(
        provider.pathExists('user:alice', 'user:bob', context),
      ).rejects.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return true when healthy', async () => {
      mockClient.query.mockResolvedValue([{ result: [{ healthy: 1 }] }]);

      const result = await provider.healthCheck();

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1 as healthy');
    });

    it('should return false when unhealthy', async () => {
      mockClient.query.mockRejectedValue(new Error('Connection failed'));

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });

    it('should handle timeout errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Timeout'));

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });

    it('should not throw on failure', async () => {
      mockClient.query.mockRejectedValue(new Error('Any error'));

      // Should not throw - just return false
      await expect(provider.healthCheck()).resolves.toBe(false);
    });
  });

  describe('Private Methods', () => {
    describe('getTraversalOperator', () => {
      it('should return correct operator for out direction', async () => {
        mockClient.query.mockResolvedValue([
          { result: [{ startNode: { id: 'user:alice' }, paths: [] }] },
        ]);

        await provider.traverse('user:alice', context, { direction: 'out' });

        const callArgs = mockClient.query.mock.calls[0];
        if (!callArgs) throw new Error('Expected query to be called');
        const [query] = callArgs;
        expect(query).toContain('->');
      });

      it('should return correct operator for in direction', async () => {
        mockClient.query.mockResolvedValue([
          { result: [{ startNode: { id: 'user:alice' }, paths: [] }] },
        ]);

        await provider.traverse('user:alice', context, { direction: 'in' });

        const callArgs = mockClient.query.mock.calls[0];
        if (!callArgs) throw new Error('Expected query to be called');
        const [query] = callArgs;
        expect(query).toContain('<-');
      });

      it('should return correct operator for both direction', async () => {
        mockClient.query.mockResolvedValue([
          { result: [{ startNode: { id: 'user:alice' }, paths: [] }] },
        ]);

        await provider.traverse('user:alice', context, { direction: 'both' });

        const callArgs = mockClient.query.mock.calls[0];
        if (!callArgs) throw new Error('Expected query to be called');
        const [query] = callArgs;
        expect(query).toContain('<->');
      });
    });

    describe('extractTableName', () => {
      it('should extract table name from record ID', async () => {
        mockClient.query.mockResolvedValue([
          { result: [{ startNode: { id: 'user:alice' }, paths: [] }] },
        ]);

        const result = await provider.traverse('user:alice', context);

        expect(result.start.table).toBe('user');
      });

      it('should handle record ID with colon', async () => {
        mockClient.query.mockResolvedValue([
          { result: [{ startNode: { id: 'follows:abc123' }, paths: [] }] },
        ]);

        const result = await provider.traverse('follows:abc123', context);

        expect(result.start.table).toBe('follows');
      });

      it('should handle malformed record ID', async () => {
        mockClient.query.mockResolvedValue([
          { result: [{ startNode: { id: 'invalid' }, paths: [] }] },
        ]);

        const result = await provider.traverse('invalid', context);

        // When there's no colon, the whole string is treated as table name
        expect(result.start.table).toBe('invalid');
      });
    });
  });
});
