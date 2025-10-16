/**
 * @fileoverview Test suite for GraphService orchestrator.
 * Tests method delegation, logging, and error handling.
 * @module tests/services/graph/core/GraphService.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphService } from '@/services/graph/core/GraphService.js';
import type {
  IGraphProvider,
  Edge,
  GraphPath,
  TraversalResult,
} from '@/services/graph/core/IGraphProvider.js';
import { requestContextService } from '@/utils/index.js';
import type { RequestContext } from '@/utils/index.js';

// Mock provider for testing
class MockGraphProvider implements IGraphProvider {
  readonly name = 'mock-graph-provider';

  relate = vi.fn();
  unrelate = vi.fn();
  traverse = vi.fn();
  shortestPath = vi.fn();
  getOutgoingEdges = vi.fn();
  getIncomingEdges = vi.fn();
  pathExists = vi.fn();
  getStats = vi.fn();
  healthCheck = vi.fn();
}

describe('GraphService', () => {
  let graphService: GraphService;
  let mockProvider: MockGraphProvider;
  let context: RequestContext;

  beforeEach(() => {
    mockProvider = new MockGraphProvider();
    graphService = new GraphService(mockProvider);
    context = requestContextService.createRequestContext({
      operation: 'test-graph-service',
    });
  });

  describe('Constructor', () => {
    it('should initialize with provider', () => {
      expect(graphService).toBeDefined();
      expect(graphService.getProvider()).toBe(mockProvider);
    });

    it('should store provider reference', () => {
      const provider = graphService.getProvider();
      expect(provider.name).toBe('mock-graph-provider');
    });
  });

  describe('relate', () => {
    it('should delegate to provider.relate', async () => {
      const mockEdge: Edge = {
        id: 'edge:123',
        table: 'follows',
        from: 'user:alice',
        to: 'user:bob',
        data: {},
      };

      mockProvider.relate.mockResolvedValue(mockEdge);

      const result = await graphService.relate(
        'user:alice',
        'follows',
        'user:bob',
        context,
      );

      expect(mockProvider.relate).toHaveBeenCalledWith(
        'user:alice',
        'follows',
        'user:bob',
        context,
        undefined,
      );
      expect(result).toEqual(mockEdge);
    });

    it('should pass options to provider', async () => {
      const mockEdge: Edge = {
        id: 'edge:123',
        table: 'follows',
        from: 'user:alice',
        to: 'user:bob',
        data: { since: '2025-01-01' },
      };

      const options = {
        data: { since: '2025-01-01' },
        allowDuplicates: false,
      };

      mockProvider.relate.mockResolvedValue(mockEdge);

      await graphService.relate(
        'user:alice',
        'follows',
        'user:bob',
        context,
        options,
      );

      expect(mockProvider.relate).toHaveBeenCalledWith(
        'user:alice',
        'follows',
        'user:bob',
        context,
        options,
      );
    });

    it('should propagate errors from provider', async () => {
      const error = new Error('Failed to create edge');
      mockProvider.relate.mockRejectedValue(error);

      await expect(
        graphService.relate('user:alice', 'follows', 'user:bob', context),
      ).rejects.toThrow('Failed to create edge');
    });
  });

  describe('unrelate', () => {
    it('should delegate to provider.unrelate', async () => {
      mockProvider.unrelate.mockResolvedValue(true);

      const result = await graphService.unrelate('edge:123', context);

      expect(mockProvider.unrelate).toHaveBeenCalledWith('edge:123', context);
      expect(result).toBe(true);
    });

    it('should return false when edge not found', async () => {
      mockProvider.unrelate.mockResolvedValue(false);

      const result = await graphService.unrelate('edge:999', context);

      expect(result).toBe(false);
    });

    it('should propagate errors from provider', async () => {
      const error = new Error('Failed to delete edge');
      mockProvider.unrelate.mockRejectedValue(error);

      await expect(graphService.unrelate('edge:123', context)).rejects.toThrow(
        'Failed to delete edge',
      );
    });
  });

  describe('traverse', () => {
    it('should delegate to provider.traverse', async () => {
      const mockResult: TraversalResult = {
        start: {
          id: 'user:alice',
          table: 'user',
          data: {},
        },
        paths: [],
      };

      mockProvider.traverse.mockResolvedValue(mockResult);

      const result = await graphService.traverse('user:alice', context);

      expect(mockProvider.traverse).toHaveBeenCalledWith(
        'user:alice',
        context,
        undefined,
      );
      expect(result).toEqual(mockResult);
    });

    it('should pass traversal options to provider', async () => {
      const mockResult: TraversalResult = {
        start: { id: 'user:alice', table: 'user', data: {} },
        paths: [],
      };

      const options = {
        maxDepth: 3,
        direction: 'out' as const,
        edgeTypes: ['follows'],
      };

      mockProvider.traverse.mockResolvedValue(mockResult);

      await graphService.traverse('user:alice', context, options);

      expect(mockProvider.traverse).toHaveBeenCalledWith(
        'user:alice',
        context,
        options,
      );
    });

    it('should propagate errors from provider', async () => {
      const error = new Error('Traversal failed');
      mockProvider.traverse.mockRejectedValue(error);

      await expect(
        graphService.traverse('user:alice', context),
      ).rejects.toThrow('Traversal failed');
    });
  });

  describe('shortestPath', () => {
    it('should delegate to provider.shortestPath', async () => {
      const mockPath: GraphPath = {
        vertices: [
          { id: 'user:alice', table: 'user', data: {} },
          { id: 'user:bob', table: 'user', data: {} },
        ],
        edges: [
          {
            id: 'follows:1',
            table: 'follows',
            from: 'user:alice',
            to: 'user:bob',
            data: {},
          },
        ],
        weight: 1.0,
      };

      mockProvider.shortestPath.mockResolvedValue(mockPath);

      const result = await graphService.shortestPath(
        'user:alice',
        'user:bob',
        context,
      );

      expect(mockProvider.shortestPath).toHaveBeenCalledWith(
        'user:alice',
        'user:bob',
        context,
        undefined,
      );
      expect(result).toEqual(mockPath);
    });

    it('should return null when no path exists', async () => {
      mockProvider.shortestPath.mockResolvedValue(null);

      const result = await graphService.shortestPath(
        'user:alice',
        'user:charlie',
        context,
      );

      expect(result).toBeNull();
    });

    it('should pass path options to provider', async () => {
      const options = {
        maxLength: 5,
        algorithm: 'dijkstra' as const,
      };

      mockProvider.shortestPath.mockResolvedValue(null);

      await graphService.shortestPath(
        'user:alice',
        'user:bob',
        context,
        options,
      );

      expect(mockProvider.shortestPath).toHaveBeenCalledWith(
        'user:alice',
        'user:bob',
        context,
        options,
      );
    });

    it('should propagate errors from provider', async () => {
      const error = new Error('Pathfinding failed');
      mockProvider.shortestPath.mockRejectedValue(error);

      await expect(
        graphService.shortestPath('user:alice', 'user:bob', context),
      ).rejects.toThrow('Pathfinding failed');
    });
  });

  describe('getOutgoingEdges', () => {
    it('should delegate to provider.getOutgoingEdges', async () => {
      const mockEdges: Edge[] = [
        {
          id: 'follows:1',
          table: 'follows',
          from: 'user:alice',
          to: 'user:bob',
          data: {},
        },
      ];

      mockProvider.getOutgoingEdges.mockResolvedValue(mockEdges);

      const result = await graphService.getOutgoingEdges('user:alice', context);

      expect(mockProvider.getOutgoingEdges).toHaveBeenCalledWith(
        'user:alice',
        context,
        undefined,
      );
      expect(result).toEqual(mockEdges);
    });

    it('should filter by edge types', async () => {
      const mockEdges: Edge[] = [
        {
          id: 'follows:1',
          table: 'follows',
          from: 'user:alice',
          to: 'user:bob',
          data: {},
        },
      ];

      mockProvider.getOutgoingEdges.mockResolvedValue(mockEdges);

      await graphService.getOutgoingEdges('user:alice', context, ['follows']);

      expect(mockProvider.getOutgoingEdges).toHaveBeenCalledWith(
        'user:alice',
        context,
        ['follows'],
      );
    });

    it('should return empty array when no edges exist', async () => {
      mockProvider.getOutgoingEdges.mockResolvedValue([]);

      const result = await graphService.getOutgoingEdges('user:alice', context);

      expect(result).toEqual([]);
    });
  });

  describe('getIncomingEdges', () => {
    it('should delegate to provider.getIncomingEdges', async () => {
      const mockEdges: Edge[] = [
        {
          id: 'follows:1',
          table: 'follows',
          from: 'user:bob',
          to: 'user:alice',
          data: {},
        },
      ];

      mockProvider.getIncomingEdges.mockResolvedValue(mockEdges);

      const result = await graphService.getIncomingEdges('user:alice', context);

      expect(mockProvider.getIncomingEdges).toHaveBeenCalledWith(
        'user:alice',
        context,
        undefined,
      );
      expect(result).toEqual(mockEdges);
    });

    it('should filter by edge types', async () => {
      const mockEdges: Edge[] = [
        {
          id: 'follows:1',
          table: 'follows',
          from: 'user:bob',
          to: 'user:alice',
          data: {},
        },
      ];

      mockProvider.getIncomingEdges.mockResolvedValue(mockEdges);

      await graphService.getIncomingEdges('user:alice', context, ['follows']);

      expect(mockProvider.getIncomingEdges).toHaveBeenCalledWith(
        'user:alice',
        context,
        ['follows'],
      );
    });

    it('should return empty array when no edges exist', async () => {
      mockProvider.getIncomingEdges.mockResolvedValue([]);

      const result = await graphService.getIncomingEdges('user:alice', context);

      expect(result).toEqual([]);
    });
  });

  describe('pathExists', () => {
    it('should delegate to provider.pathExists', async () => {
      mockProvider.pathExists.mockResolvedValue(true);

      const result = await graphService.pathExists(
        'user:alice',
        'user:bob',
        context,
      );

      expect(mockProvider.pathExists).toHaveBeenCalledWith(
        'user:alice',
        'user:bob',
        context,
        undefined,
      );
      expect(result).toBe(true);
    });

    it('should return false when no path exists', async () => {
      mockProvider.pathExists.mockResolvedValue(false);

      const result = await graphService.pathExists(
        'user:alice',
        'user:charlie',
        context,
      );

      expect(result).toBe(false);
    });

    it('should pass maxDepth to provider', async () => {
      mockProvider.pathExists.mockResolvedValue(true);

      await graphService.pathExists('user:alice', 'user:bob', context, 5);

      expect(mockProvider.pathExists).toHaveBeenCalledWith(
        'user:alice',
        'user:bob',
        context,
        5,
      );
    });

    it('should propagate errors from provider', async () => {
      const error = new Error('Path check failed');
      mockProvider.pathExists.mockRejectedValue(error);

      await expect(
        graphService.pathExists('user:alice', 'user:bob', context),
      ).rejects.toThrow('Path check failed');
    });
  });

  describe('healthCheck', () => {
    it('should delegate to provider.healthCheck', async () => {
      mockProvider.healthCheck.mockResolvedValue(true);

      const result = await graphService.healthCheck();

      expect(mockProvider.healthCheck).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when provider is unhealthy', async () => {
      mockProvider.healthCheck.mockResolvedValue(false);

      const result = await graphService.healthCheck();

      expect(result).toBe(false);
    });

    it('should propagate errors from provider', async () => {
      const error = new Error('Health check failed');
      mockProvider.healthCheck.mockRejectedValue(error);

      await expect(graphService.healthCheck()).rejects.toThrow(
        'Health check failed',
      );
    });
  });
});
