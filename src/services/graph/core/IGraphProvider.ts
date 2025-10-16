/**
 * @fileoverview Interface for graph database providers.
 * Defines the contract for graph operations including relationships and traversals.
 * @module src/services/graph/core/IGraphProvider
 */

import type { RequestContext } from '@/utils/index.js';
import type { GraphStats } from '../types.js';

/**
 * Direction for graph traversal.
 */
export type TraversalDirection = 'out' | 'in' | 'both';

/**
 * Represents a vertex (node) in the graph.
 */
export interface Vertex {
  /** Unique identifier for the vertex */
  id: string;
  /** Table/type of the vertex */
  table: string;
  /** Vertex data */
  data: Record<string, unknown>;
}

/**
 * Represents an edge (relationship) in the graph.
 */
export interface Edge {
  /** Unique identifier for the edge */
  id: string;
  /** Table/type of the edge */
  table: string;
  /** Source vertex ID */
  from: string;
  /** Target vertex ID */
  to: string;
  /** Edge metadata */
  data: Record<string, unknown>;
}

/**
 * Options for relationship creation.
 */
export interface RelateOptions {
  /** Edge metadata to store */
  data?: Record<string, unknown>;
  /** Whether to allow duplicate relationships */
  allowDuplicates?: boolean;
}

/**
 * Options for graph traversal queries.
 */
export interface TraversalOptions {
  /** Maximum depth to traverse (default: 1) */
  maxDepth?: number;
  /** Direction to traverse (default: 'out') */
  direction?: TraversalDirection;
  /** Filter edges by type */
  edgeTypes?: string[];
  /** Filter vertices by type */
  vertexTypes?: string[];
  /** WHERE clause for filtering */
  where?: string;
}

/**
 * Result of a graph traversal.
 */
export interface TraversalResult {
  /** Starting vertex */
  start: Vertex;
  /** Paths found during traversal */
  paths: GraphPath[];
}

/**
 * Represents a path through the graph.
 */
export interface GraphPath {
  /** Vertices in the path */
  vertices: Vertex[];
  /** Edges connecting the vertices */
  edges: Edge[];
  /** Total weight/cost of the path */
  weight?: number;
}

/**
 * Options for pathfinding algorithms.
 */
export interface PathOptions {
  /** Maximum path length to search */
  maxLength?: number;
  /** Weight function for edges */
  weightFn?: (edge: Edge) => number;
  /** Algorithm to use */
  algorithm?: 'dijkstra' | 'bfs' | 'dfs';
}

/**
 * Defines the contract for graph database operations.
 *
 * @remarks
 * Providers must implement vertex/edge CRUD operations,
 * relationship creation, and graph traversal algorithms.
 */
export interface IGraphProvider {
  /**
   * Provider name identifier.
   */
  readonly name: string;

  /**
   * Create a relationship between two vertices.
   *
   * @param from - Source vertex ID
   * @param edgeTable - Edge table/type name
   * @param to - Target vertex ID
   * @param context - Request context for logging
   * @param options - Relationship options
   * @returns The created edge
   */
  relate(
    from: string,
    edgeTable: string,
    to: string,
    context: RequestContext,
    options?: RelateOptions,
  ): Promise<Edge>;

  /**
   * Delete a relationship edge.
   *
   * @param edgeId - Edge identifier
   * @param context - Request context for logging
   * @returns True if deleted
   */
  unrelate(edgeId: string, context: RequestContext): Promise<boolean>;

  /**
   * Traverse the graph from a starting vertex.
   *
   * @param startVertexId - Starting vertex ID
   * @param context - Request context for logging
   * @param options - Traversal options
   * @returns Traversal result with paths
   */
  traverse(
    startVertexId: string,
    context: RequestContext,
    options?: TraversalOptions,
  ): Promise<TraversalResult>;

  /**
   * Find the shortest path between two vertices.
   *
   * @param from - Source vertex ID
   * @param to - Target vertex ID
   * @param context - Request context for logging
   * @param options - Pathfinding options
   * @returns Shortest path or null if no path exists
   */
  shortestPath(
    from: string,
    to: string,
    context: RequestContext,
    options?: PathOptions,
  ): Promise<GraphPath | null>;

  /**
   * Get all outgoing edges from a vertex.
   *
   * @param vertexId - Vertex identifier
   * @param context - Request context for logging
   * @param edgeTypes - Optional filter by edge types
   * @returns Array of outgoing edges
   */
  getOutgoingEdges(
    vertexId: string,
    context: RequestContext,
    edgeTypes?: string[],
  ): Promise<Edge[]>;

  /**
   * Get all incoming edges to a vertex.
   *
   * @param vertexId - Vertex identifier
   * @param context - Request context for logging
   * @param edgeTypes - Optional filter by edge types
   * @returns Array of incoming edges
   */
  getIncomingEdges(
    vertexId: string,
    context: RequestContext,
    edgeTypes?: string[],
  ): Promise<Edge[]>;

  /**
   * Check if a path exists between two vertices.
   *
   * @param from - Source vertex ID
   * @param to - Target vertex ID
   * @param context - Request context for logging
   * @param maxDepth - Maximum depth to search
   * @returns True if path exists
   */
  pathExists(
    from: string,
    to: string,
    context: RequestContext,
    maxDepth?: number,
  ): Promise<boolean>;

  /**
   * Get statistics about the graph.
   *
   * @param context - Request context for logging
   * @returns Graph statistics including vertex/edge counts and type distributions
   */
  getStats(context: RequestContext): Promise<GraphStats>;

  /**
   * Perform health check on the provider.
   *
   * @returns True if provider is healthy
   */
  healthCheck(): Promise<boolean>;
}
