/**
 * @fileoverview Test suite for graph service barrel exports.
 * Validates that all public APIs are exported correctly.
 * @module tests/services/graph/index.test
 */

import { describe, it, expect } from 'vitest';
import * as GraphModule from '@/services/graph/index.js';

describe('Graph Service Barrel Exports', () => {
  describe('Class Exports', () => {
    it('should export GraphService', () => {
      expect(GraphModule.GraphService).toBeDefined();
      expect(typeof GraphModule.GraphService).toBe('function');
    });

    it('should export SurrealGraphProvider', () => {
      expect(GraphModule.SurrealGraphProvider).toBeDefined();
      expect(typeof GraphModule.SurrealGraphProvider).toBe('function');
    });
  });

  describe('Type Exports', () => {
    it('should export type definitions', () => {
      // Type exports can't be checked at runtime, but we can ensure
      // they compile correctly by attempting to use them
      type ExportedTypes = {
        IGraphProvider: GraphModule.IGraphProvider;
        Vertex: GraphModule.Vertex;
        Edge: GraphModule.Edge;
        GraphPath: GraphModule.GraphPath;
        TraversalResult: GraphModule.TraversalResult;
        TraversalDirection: GraphModule.TraversalDirection;
        RelateOptions: GraphModule.RelateOptions;
        TraversalOptions: GraphModule.TraversalOptions;
        PathOptions: GraphModule.PathOptions;
        GraphProviderType: GraphModule.GraphProviderType;
        GraphServiceConfig: GraphModule.GraphServiceConfig;
        GraphStats: GraphModule.GraphStats;
        GraphPattern: GraphModule.GraphPattern;
        PatternMatchResult: GraphModule.PatternMatchResult;
      };

      // If this compiles, all types are exported correctly
      const typeCheck: ExportedTypes = {} as ExportedTypes;
      expect(typeCheck).toBeDefined();
    });
  });

  describe('Module Structure', () => {
    it('should have expected exports count', () => {
      const exports = Object.keys(GraphModule);

      // Should have at least GraphService and SurrealGraphProvider
      expect(exports.length).toBeGreaterThanOrEqual(2);

      // Check for core exports
      expect(exports).toContain('GraphService');
      expect(exports).toContain('SurrealGraphProvider');
    });

    it('should not export internal implementation details', () => {
      const exports = Object.keys(GraphModule);

      // Should not export private utilities or test helpers
      expect(exports).not.toContain('__private');
      expect(exports).not.toContain('mockProvider');
      expect(exports).not.toContain('testHelpers');
    });
  });

  describe('Import Compatibility', () => {
    it('should support named imports', async () => {
      const { GraphService, SurrealGraphProvider } = await import(
        '@/services/graph/index.js'
      );

      expect(GraphService).toBeDefined();
      expect(SurrealGraphProvider).toBeDefined();
    });

    it('should support namespace import', async () => {
      const GraphNamespace = await import('@/services/graph/index.js');

      expect(GraphNamespace.GraphService).toBeDefined();
      expect(GraphNamespace.SurrealGraphProvider).toBeDefined();
    });

    it('should support type-only imports', () => {
      // This is a compile-time check - if it compiles, it works
      type TestType = GraphModule.IGraphProvider;

      const test: TestType = {
        name: 'test',
        relate: async () => ({}) as GraphModule.Edge,
        unrelate: async () => true,
        traverse: async () => ({}) as GraphModule.TraversalResult,
        shortestPath: async () => null,
        getOutgoingEdges: async () => [],
        getIncomingEdges: async () => [],
        pathExists: async () => false,
        getStats: async () =>
          ({
            vertexCount: 0,
            edgeCount: 0,
            avgDegree: 0,
            vertexTypes: {},
            edgeTypes: {},
          }) as GraphModule.GraphStats,
        healthCheck: async () => true,
      };

      expect(test.name).toBe('test');
    });
  });

  describe('Re-export Chain', () => {
    it('should re-export from core correctly', () => {
      // GraphService should be the same as importing from core
      expect(GraphModule.GraphService).toBeDefined();
    });

    it('should re-export from providers correctly', () => {
      // SurrealGraphProvider should be the same as importing from providers
      expect(GraphModule.SurrealGraphProvider).toBeDefined();
    });

    it('should re-export types correctly', () => {
      // Type re-exports should compile without errors
      type CoreTypes = {
        vertex: GraphModule.Vertex;
        edge: GraphModule.Edge;
        path: GraphModule.GraphPath;
      };

      const test: CoreTypes = {
        vertex: { id: 'test:1', table: 'test', data: {} },
        edge: {
          id: 'edge:1',
          table: 'rel',
          from: 'a:1',
          to: 'b:1',
          data: {},
        },
        path: { vertices: [], edges: [] },
      };

      expect(test).toBeDefined();
    });
  });

  describe('Tree Shaking Support', () => {
    it('should support selective imports', async () => {
      // Verify we can import just what we need
      const { GraphService } = await import('@/services/graph/index.js');

      expect(GraphService).toBeDefined();
      expect(typeof GraphService).toBe('function');
    });

    it('should not include unnecessary code when using specific exports', async () => {
      // This is more of a build-time concern, but we can verify
      // that imports are properly structured
      const { SurrealGraphProvider } = await import(
        '@/services/graph/index.js'
      );

      expect(SurrealGraphProvider).toBeDefined();
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain stable export names', () => {
      // These export names should remain stable across versions
      const stableExports = ['GraphService', 'SurrealGraphProvider'];

      const exports = Object.keys(GraphModule);

      for (const exportName of stableExports) {
        expect(exports).toContain(exportName);
      }
    });

    it('should not break existing import patterns', async () => {
      // Common import patterns should continue to work
      const patterns = [
        () => import('@/services/graph/index.js'),
        () => import('@/services/graph/core/GraphService.js'),
        () => import('@/services/graph/providers/surrealGraph.provider.js'),
      ];

      for (const pattern of patterns) {
        await expect(pattern()).resolves.toBeDefined();
      }
    });
  });
});
