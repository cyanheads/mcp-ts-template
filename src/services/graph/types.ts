/**
 * @fileoverview Type definitions for the graph service layer.
 * Re-exports core graph primitives from IGraphProvider and defines
 * service-level configuration, statistics, and pattern-matching types.
 * @module src/services/graph/types
 */

export type {
  Edge,
  GraphPath,
  PathOptions,
  RelateOptions,
  TraversalDirection,
  TraversalOptions,
  TraversalResult,
  Vertex,
} from './core/IGraphProvider.js';

/**
 * Discriminated union of supported graph provider backends.
 * Currently only `'mock'` is available; extend this union when adding real backends.
 */
export type GraphProviderType = 'mock';

/**
 * Configuration for instantiating the graph service.
 *
 * @example
 * ```ts
 * const config: GraphServiceConfig = {
 *   provider: 'mock',
 *   config: { seedData: true },
 * };
 * ```
 */
export interface GraphServiceConfig {
  /** Additional provider-specific configuration passed through to the provider constructor */
  config?: Record<string, unknown>;
  /** Which graph provider backend to instantiate */
  provider: GraphProviderType;
}

/**
 * Aggregate statistics describing the current state of a graph.
 *
 * @example
 * ```ts
 * const stats: GraphStats = await graphService.getStats(context);
 * console.log(`${stats.vertexCount} vertices, ${stats.edgeCount} edges`);
 * console.log(`Avg degree: ${stats.avgDegree}`);
 * ```
 */
export interface GraphStats {
  /** Mean number of edges per vertex across the entire graph */
  avgDegree: number;
  /** Total number of edges (relationships) in the graph */
  edgeCount: number;
  /** Map of edge table name to count of edges of that type */
  edgeTypes: Record<string, number>;
  /** Total number of vertices (nodes) in the graph */
  vertexCount: number;
  /** Map of vertex table name to count of vertices of that type */
  vertexTypes: Record<string, number>;
}

/**
 * A declarative pattern used to query subgraphs by structural shape.
 *
 * @example
 * ```ts
 * const pattern: GraphPattern = {
 *   pattern: '(person)-[knows]->(person)',
 *   params: { minAge: 18 },
 * };
 * ```
 */
export interface GraphPattern {
  /** Named parameters bound into the pattern at query time */
  params?: Record<string, unknown>;
  /**
   * Pattern string describing the structural shape to match.
   * Uses graph path notation, e.g. `"(person)-[knows]->(person)"`.
   */
  pattern: string;
}

/**
 * Result returned by a graph pattern-matching query.
 *
 * @example
 * ```ts
 * const result: PatternMatchResult = await provider.matchPattern(pattern, context);
 * console.log(`Found ${result.count} matching subgraphs`);
 * for (const match of result.matches) {
 *   console.log(match.vertices.map(v => v.id).join(' -> '));
 * }
 * ```
 */
export interface PatternMatchResult {
  /** Total number of subgraph matches found */
  count: number;
  /** Each matched subgraph, containing the vertices and edges that satisfied the pattern */
  matches: Array<{
    /** Ordered vertices in the matched path */
    vertices: Array<{
      id: string;
      table: string;
      data: Record<string, unknown>;
    }>;
    /** Edges connecting the matched vertices */
    edges: Array<{
      id: string;
      table: string;
      from: string;
      to: string;
      data: Record<string, unknown>;
    }>;
    /** Cumulative path weight, if edge weights are defined */
    weight?: number;
  }>;
}
