/**
 * @fileoverview Test suite for IGraphProvider interface.
 * Validates interface contract and type definitions.
 * @module tests/services/graph/core/IGraphProvider.test
 */

import { describe, it, expect } from 'vitest';
import type {
  IGraphProvider,
  TraversalDirection,
  Vertex,
  Edge,
  RelateOptions,
  TraversalOptions,
  PathOptions,
  TraversalResult,
  GraphPath,
} from '@/services/graph/core/IGraphProvider.js';

describe('IGraphProvider Interface', () => {
  describe('Type Definitions', () => {
    it('should define TraversalDirection type correctly', () => {
      const validDirections: TraversalDirection[] = ['out', 'in', 'both'];
      expect(validDirections).toHaveLength(3);
    });

    it('should define Vertex interface structure', () => {
      const vertex: Vertex = {
        id: 'test:123',
        table: 'test',
        data: { name: 'Test Vertex' },
      };

      expect(vertex).toHaveProperty('id');
      expect(vertex).toHaveProperty('table');
      expect(vertex).toHaveProperty('data');
    });

    it('should define Edge interface structure', () => {
      const testEdge: Edge = {
        id: 'edge:456',
        table: 'follows',
        from: 'user:alice',
        to: 'user:bob',
        data: { since: '2025-01-01' },
      };

      expect(testEdge).toHaveProperty('id');
      expect(testEdge).toHaveProperty('table');
      expect(testEdge).toHaveProperty('from');
      expect(testEdge).toHaveProperty('to');
      expect(testEdge).toHaveProperty('data');
    });

    it('should define RelateOptions interface structure', () => {
      const options: RelateOptions = {
        data: { weight: 1.5 },
        allowDuplicates: false,
      };

      expect(options).toHaveProperty('data');
      expect(options).toHaveProperty('allowDuplicates');
    });

    it('should define TraversalOptions interface structure', () => {
      const options: TraversalOptions = {
        maxDepth: 3,
        direction: 'out',
        edgeTypes: ['follows', 'likes'],
        vertexTypes: ['user', 'post'],
        where: 'age > 18',
      };

      expect(options).toHaveProperty('maxDepth');
      expect(options).toHaveProperty('direction');
      expect(options).toHaveProperty('edgeTypes');
      expect(options).toHaveProperty('vertexTypes');
      expect(options).toHaveProperty('where');
    });

    it('should define PathOptions interface structure', () => {
      const options: PathOptions = {
        maxLength: 5,
        algorithm: 'dijkstra',
        weightFn: (_edge: Edge) => 1,
      };

      expect(options).toHaveProperty('maxLength');
      expect(options).toHaveProperty('algorithm');
      expect(options).toHaveProperty('weightFn');
    });

    it('should define GraphPath interface structure', () => {
      const path: GraphPath = {
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

      expect(path).toHaveProperty('vertices');
      expect(path).toHaveProperty('edges');
      expect(path).toHaveProperty('weight');
    });

    it('should define TraversalResult interface structure', () => {
      const result: TraversalResult = {
        start: { id: 'user:alice', table: 'user', data: {} },
        paths: [],
      };

      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('paths');
    });
  });

  describe('Interface Contract', () => {
    it('should require name property', () => {
      // Type check: IGraphProvider must have a readonly name property
      type HasName = IGraphProvider extends { readonly name: string }
        ? true
        : false;
      const hasName: HasName = true;
      expect(hasName).toBe(true);
    });

    it('should require relate method', () => {
      // Type check: IGraphProvider must have relate method
      type HasRelate = IGraphProvider extends {
        relate: (...args: any[]) => Promise<Edge>;
      }
        ? true
        : false;
      const hasRelate: HasRelate = true;
      expect(hasRelate).toBe(true);
    });

    it('should require unrelate method', () => {
      // Type check: IGraphProvider must have unrelate method
      type HasUnrelate = IGraphProvider extends {
        unrelate: (...args: any[]) => Promise<boolean>;
      }
        ? true
        : false;
      const hasUnrelate: HasUnrelate = true;
      expect(hasUnrelate).toBe(true);
    });

    it('should require traverse method', () => {
      // Type check: IGraphProvider must have traverse method
      type HasTraverse = IGraphProvider extends {
        traverse: (...args: any[]) => Promise<TraversalResult>;
      }
        ? true
        : false;
      const hasTraverse: HasTraverse = true;
      expect(hasTraverse).toBe(true);
    });

    it('should require shortestPath method', () => {
      // Type check: IGraphProvider must have shortestPath method
      type HasShortestPath = IGraphProvider extends {
        shortestPath: (...args: any[]) => Promise<GraphPath | null>;
      }
        ? true
        : false;
      const hasShortestPath: HasShortestPath = true;
      expect(hasShortestPath).toBe(true);
    });

    it('should require getOutgoingEdges method', () => {
      // Type check: IGraphProvider must have getOutgoingEdges method
      type HasGetOutgoingEdges = IGraphProvider extends {
        getOutgoingEdges: (...args: any[]) => Promise<Edge[]>;
      }
        ? true
        : false;
      const hasGetOutgoingEdges: HasGetOutgoingEdges = true;
      expect(hasGetOutgoingEdges).toBe(true);
    });

    it('should require getIncomingEdges method', () => {
      // Type check: IGraphProvider must have getIncomingEdges method
      type HasGetIncomingEdges = IGraphProvider extends {
        getIncomingEdges: (...args: any[]) => Promise<Edge[]>;
      }
        ? true
        : false;
      const hasGetIncomingEdges: HasGetIncomingEdges = true;
      expect(hasGetIncomingEdges).toBe(true);
    });

    it('should require pathExists method', () => {
      // Type check: IGraphProvider must have pathExists method
      type HasPathExists = IGraphProvider extends {
        pathExists: (...args: any[]) => Promise<boolean>;
      }
        ? true
        : false;
      const hasPathExists: HasPathExists = true;
      expect(hasPathExists).toBe(true);
    });

    it('should require healthCheck method', () => {
      // Type check: IGraphProvider must have healthCheck method
      type HasHealthCheck = IGraphProvider extends {
        healthCheck: () => Promise<boolean>;
      }
        ? true
        : false;
      const hasHealthCheck: HasHealthCheck = true;
      expect(hasHealthCheck).toBe(true);
    });
  });
});
