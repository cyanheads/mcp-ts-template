/**
 * @fileoverview Test suite for graph service type definitions.
 * Validates type exports and type compatibility.
 * @module tests/services/graph/types.test
 */

import { describe, it, expect } from 'vitest';
import type {
  Vertex,
  Edge,
  GraphPath,
  TraversalResult,
  TraversalDirection,
  RelateOptions,
  TraversalOptions,
  PathOptions,
  GraphProviderType,
  GraphServiceConfig,
  GraphStats,
  GraphPattern,
  PatternMatchResult,
} from '@/services/graph/types.js';

describe('Graph Service Types', () => {
  describe('Re-exported Core Types', () => {
    it('should export Vertex type', () => {
      const vertex: Vertex = {
        id: 'test:123',
        table: 'test',
        data: { name: 'Test' },
      };

      expect(vertex).toHaveProperty('id');
      expect(vertex).toHaveProperty('table');
      expect(vertex).toHaveProperty('data');
    });

    it('should export Edge type', () => {
      const edge: Edge = {
        id: 'edge:456',
        table: 'follows',
        from: 'user:alice',
        to: 'user:bob',
        data: {},
      };

      expect(edge).toHaveProperty('id');
      expect(edge).toHaveProperty('table');
      expect(edge).toHaveProperty('from');
      expect(edge).toHaveProperty('to');
      expect(edge).toHaveProperty('data');
    });

    it('should export GraphPath type', () => {
      const path: GraphPath = {
        vertices: [],
        edges: [],
        weight: 1.0,
      };

      expect(path).toHaveProperty('vertices');
      expect(path).toHaveProperty('edges');
    });

    it('should export TraversalResult type', () => {
      const result: TraversalResult = {
        start: { id: 'test:1', table: 'test', data: {} },
        paths: [],
      };

      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('paths');
    });

    it('should export TraversalDirection type', () => {
      const directions: TraversalDirection[] = ['out', 'in', 'both'];
      expect(directions).toHaveLength(3);
    });

    it('should export RelateOptions type', () => {
      const options: RelateOptions = {
        data: { weight: 1 },
        allowDuplicates: false,
      };

      expect(options).toBeDefined();
    });

    it('should export TraversalOptions type', () => {
      const options: TraversalOptions = {
        maxDepth: 3,
        direction: 'out',
        edgeTypes: ['follows'],
        vertexTypes: ['user'],
        where: 'age > 18',
      };

      expect(options).toBeDefined();
    });

    it('should export PathOptions type', () => {
      const options: PathOptions = {
        maxLength: 5,
        algorithm: 'dijkstra',
      };

      expect(options).toBeDefined();
    });
  });

  describe('GraphProviderType', () => {
    it('should define surrealdb provider type', () => {
      const providerType: GraphProviderType = 'surrealdb';
      expect(providerType).toBe('surrealdb');
    });

    it('should define mock provider type', () => {
      const providerType: GraphProviderType = 'mock';
      expect(providerType).toBe('mock');
    });

    it('should only allow valid provider types', () => {
      const validTypes: GraphProviderType[] = ['surrealdb', 'mock'];
      expect(validTypes).toHaveLength(2);
    });
  });

  describe('GraphServiceConfig', () => {
    it('should define config structure with provider', () => {
      const config: GraphServiceConfig = {
        provider: 'surrealdb',
      };

      expect(config).toHaveProperty('provider');
      expect(config.provider).toBe('surrealdb');
    });

    it('should support additional provider config', () => {
      const config: GraphServiceConfig = {
        provider: 'surrealdb',
        config: {
          namespace: 'test',
          database: 'graph',
        },
      };

      expect(config).toHaveProperty('config');
      expect(config.config).toHaveProperty('namespace');
      expect(config.config).toHaveProperty('database');
    });

    it('should work with mock provider', () => {
      const config: GraphServiceConfig = {
        provider: 'mock',
        config: {
          autoConnect: true,
        },
      };

      expect(config.provider).toBe('mock');
    });
  });

  describe('GraphStats', () => {
    it('should define statistics structure', () => {
      const stats: GraphStats = {
        vertexCount: 100,
        edgeCount: 250,
        avgDegree: 2.5,
        vertexTypes: {
          user: 50,
          post: 50,
        },
        edgeTypes: {
          follows: 100,
          likes: 150,
        },
      };

      expect(stats).toHaveProperty('vertexCount');
      expect(stats).toHaveProperty('edgeCount');
      expect(stats).toHaveProperty('avgDegree');
      expect(stats).toHaveProperty('vertexTypes');
      expect(stats).toHaveProperty('edgeTypes');
    });

    it('should support zero counts', () => {
      const stats: GraphStats = {
        vertexCount: 0,
        edgeCount: 0,
        avgDegree: 0,
        vertexTypes: {},
        edgeTypes: {},
      };

      expect(stats.vertexCount).toBe(0);
      expect(stats.edgeCount).toBe(0);
    });

    it('should calculate average degree correctly', () => {
      const stats: GraphStats = {
        vertexCount: 10,
        edgeCount: 25,
        avgDegree: 2.5,
        vertexTypes: { user: 10 },
        edgeTypes: { follows: 25 },
      };

      expect(stats.avgDegree).toBe(stats.edgeCount / stats.vertexCount);
    });
  });

  describe('GraphPattern', () => {
    it('should define pattern structure', () => {
      const pattern: GraphPattern = {
        pattern: '(person)-[knows]->(person)',
      };

      expect(pattern).toHaveProperty('pattern');
      expect(typeof pattern.pattern).toBe('string');
    });

    it('should support pattern parameters', () => {
      const pattern: GraphPattern = {
        pattern: '(person {name: $name})-[knows]->(person)',
        params: {
          name: 'Alice',
        },
      };

      expect(pattern).toHaveProperty('params');
      expect(pattern.params).toHaveProperty('name');
    });

    it('should support complex patterns', () => {
      const pattern: GraphPattern = {
        pattern: '(user)-[follows*1..3]->(user)<-[likes]-(post)',
        params: {
          minAge: 18,
          maxHops: 3,
        },
      };

      expect(pattern.pattern).toContain('*1..3');
      expect(pattern.params).toBeDefined();
    });
  });

  describe('PatternMatchResult', () => {
    it('should define result structure', () => {
      const result: PatternMatchResult = {
        matches: [],
        count: 0,
      };

      expect(result).toHaveProperty('matches');
      expect(result).toHaveProperty('count');
      expect(Array.isArray(result.matches)).toBe(true);
    });

    it('should support matched subgraphs', () => {
      const result: PatternMatchResult = {
        matches: [
          {
            vertices: [
              { id: 'user:alice', table: 'user', data: { name: 'Alice' } },
              { id: 'user:bob', table: 'user', data: { name: 'Bob' } },
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
          },
        ],
        count: 1,
      };

      expect(result.matches).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.matches[0]).toHaveProperty('vertices');
      expect(result.matches[0]).toHaveProperty('edges');
    });

    it('should support weighted matches', () => {
      const result: PatternMatchResult = {
        matches: [
          {
            vertices: [{ id: 'user:alice', table: 'user', data: {} }],
            edges: [],
            weight: 1.5,
          },
        ],
        count: 1,
      };

      expect(result.matches[0]?.weight).toBe(1.5);
    });

    it('should handle multiple matches', () => {
      const result: PatternMatchResult = {
        matches: [
          {
            vertices: [{ id: 'user:alice', table: 'user', data: {} }],
            edges: [],
          },
          {
            vertices: [{ id: 'user:bob', table: 'user', data: {} }],
            edges: [],
          },
          {
            vertices: [{ id: 'user:charlie', table: 'user', data: {} }],
            edges: [],
          },
        ],
        count: 3,
      };

      expect(result.matches).toHaveLength(3);
      expect(result.count).toBe(3);
    });
  });

  describe('Type Compatibility', () => {
    it('should allow Vertex in arrays', () => {
      const vertices: Vertex[] = [
        { id: 'user:1', table: 'user', data: {} },
        { id: 'user:2', table: 'user', data: {} },
      ];

      expect(vertices).toHaveLength(2);
    });

    it('should allow Edge in arrays', () => {
      const edges: Edge[] = [
        {
          id: 'follows:1',
          table: 'follows',
          from: 'user:1',
          to: 'user:2',
          data: {},
        },
      ];

      expect(edges).toHaveLength(1);
    });

    it('should compose GraphPath with vertices and edges', () => {
      const vertices: Vertex[] = [
        { id: 'user:1', table: 'user', data: {} },
        { id: 'user:2', table: 'user', data: {} },
      ];

      const edges: Edge[] = [
        {
          id: 'follows:1',
          table: 'follows',
          from: 'user:1',
          to: 'user:2',
          data: {},
        },
      ];

      const path: GraphPath = {
        vertices,
        edges,
        weight: 1.0,
      };

      expect(path.vertices).toBe(vertices);
      expect(path.edges).toBe(edges);
    });
  });
});
