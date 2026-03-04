/**
 * @fileoverview Type definitions for graph database operations.
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
 * Graph provider type identifier.
 */
export type GraphProviderType = 'mock';

/**
 * Configuration for graph service.
 */
export interface GraphServiceConfig {
  /** Additional provider-specific configuration */
  config?: Record<string, unknown>;
  /** Provider type to use */
  provider: GraphProviderType;
}

/**
 * Statistics about a graph.
 */
export interface GraphStats {
  /** Average degree (edges per vertex) */
  avgDegree: number;
  /** Total number of edges */
  edgeCount: number;
  /** Edge types and their counts */
  edgeTypes: Record<string, number>;
  /** Total number of vertices */
  vertexCount: number;
  /** Vertex types and their counts */
  vertexTypes: Record<string, number>;
}

/**
 * Pattern for graph matching.
 */
export interface GraphPattern {
  /** Parameters for the pattern */
  params?: Record<string, unknown>;
  /** Pattern string (e.g., "(person)-[knows]->(person)") */
  pattern: string;
}

/**
 * Result of pattern matching.
 */
export interface PatternMatchResult {
  /** Total number of matches */
  count: number;
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
}
