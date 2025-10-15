/**
 * @fileoverview Type definitions for graph database operations.
 * @module src/services/graph/types
 */

export type {
  Vertex,
  Edge,
  GraphPath,
  TraversalResult,
  TraversalDirection,
  RelateOptions,
  TraversalOptions,
  PathOptions,
} from './core/IGraphProvider.js';

/**
 * Graph provider type identifier.
 */
export type GraphProviderType = 'surrealdb' | 'mock';

/**
 * Configuration for graph service.
 */
export interface GraphServiceConfig {
  /** Provider type to use */
  provider: GraphProviderType;
  /** Additional provider-specific configuration */
  config?: Record<string, unknown>;
}

/**
 * Statistics about a graph.
 */
export interface GraphStats {
  /** Total number of vertices */
  vertexCount: number;
  /** Total number of edges */
  edgeCount: number;
  /** Average degree (edges per vertex) */
  avgDegree: number;
  /** Vertex types and their counts */
  vertexTypes: Record<string, number>;
  /** Edge types and their counts */
  edgeTypes: Record<string, number>;
}

/**
 * Pattern for graph matching.
 */
export interface GraphPattern {
  /** Pattern string (e.g., "(person)-[knows]->(person)") */
  pattern: string;
  /** Parameters for the pattern */
  params?: Record<string, unknown>;
}

/**
 * Result of pattern matching.
 */
export interface PatternMatchResult {
  /** Matched subgraphs */
  matches: Array<{
    /** Vertices in the matched path */
    vertices: Array<{
      id: string;
      table: string;
      data: Record<string, unknown>;
    }>;
    /** Edges in the matched path */
    edges: Array<{
      id: string;
      table: string;
      from: string;
      to: string;
      data: Record<string, unknown>;
    }>;
    /** Path weight */
    weight?: number;
  }>;
  /** Total number of matches */
  count: number;
}
