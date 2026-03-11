/**
 * @fileoverview Interface for graph database providers, plus all core graph primitives.
 * Defines the contract for vertex/edge CRUD, relationship management, traversal,
 * and pathfinding that every provider backend must implement.
 * @module src/services/graph/core/IGraphProvider
 */

import type { RequestContext } from '@/utils/internal/requestContext.js';
import type { GraphStats } from '../types.js';

/**
 * Direction of edge traversal relative to the starting vertex.
 * - `'out'` — follow outgoing edges only (default)
 * - `'in'`  — follow incoming edges only
 * - `'both'` — follow edges in either direction
 */
export type TraversalDirection = 'out' | 'in' | 'both';

/**
 * Represents a vertex (node) in the graph.
 *
 * @example
 * ```ts
 * const vertex: Vertex = { id: 'user:alice', table: 'user', data: { name: 'Alice' } };
 * ```
 */
export interface Vertex {
  /** Arbitrary key-value payload stored on the vertex */
  data: Record<string, unknown>;
  /** Unique identifier, typically in `table:id` format (e.g. `"user:alice"`) */
  id: string;
  /** Table (collection/type) this vertex belongs to */
  table: string;
}

/**
 * Represents a directed edge (relationship) between two vertices in the graph.
 *
 * @example
 * ```ts
 * const edge: Edge = {
 *   id: 'follows:1',
 *   table: 'follows',
 *   from: 'user:alice',
 *   to: 'user:bob',
 *   data: { since: '2025-01-01' },
 * };
 * ```
 */
export interface Edge {
  /** Arbitrary key-value payload stored on the edge */
  data: Record<string, unknown>;
  /** ID of the source (tail) vertex */
  from: string;
  /** Unique identifier for this edge */
  id: string;
  /** Table (collection/type) this edge belongs to */
  table: string;
  /** ID of the target (head) vertex */
  to: string;
}

/**
 * Options controlling how a relationship edge is created.
 */
export interface RelateOptions {
  /**
   * When `true`, a new edge is created even if one already exists between
   * the same pair of vertices with the same table. Defaults to `false`.
   */
  allowDuplicates?: boolean;
  /** Arbitrary key-value payload to store on the created edge */
  data?: Record<string, unknown>;
}

/**
 * Options controlling how a graph traversal is executed.
 */
export interface TraversalOptions {
  /** Edge direction to follow from each vertex. Defaults to `'out'`. */
  direction?: TraversalDirection;
  /** Restrict traversal to edges belonging to these tables. All edge types are followed when omitted. */
  edgeTypes?: string[];
  /** Maximum number of hops from the start vertex. Defaults to `1`. */
  maxDepth?: number;
  /** Restrict returned vertices to those belonging to these tables. All vertex types are returned when omitted. */
  vertexTypes?: string[];
  /** Provider-specific filter expression applied to vertices or edges during traversal */
  where?: string;
}

/**
 * Result returned by a graph traversal operation.
 */
export interface TraversalResult {
  /** All paths discovered from the starting vertex, up to the configured depth */
  paths: GraphPath[];
  /** The resolved starting vertex that was used as the traversal root */
  start: Vertex;
}

/**
 * A single path through the graph, expressed as an ordered sequence of vertices
 * and the edges that connect them.
 */
export interface GraphPath {
  /** Edges traversed along the path, in traversal order */
  edges: Edge[];
  /** Vertices visited along the path, in traversal order */
  vertices: Vertex[];
  /** Cumulative cost of the path, present when a weight function was applied */
  weight?: number;
}

/**
 * Options for shortest-path and pathfinding queries.
 */
export interface PathOptions {
  /**
   * Graph search algorithm to apply.
   * - `'dijkstra'` — weighted shortest path (requires `weightFn`)
   * - `'bfs'` — unweighted shortest path by hop count (default)
   * - `'dfs'` — depth-first, finds *a* path but not necessarily the shortest
   */
  algorithm?: 'dijkstra' | 'bfs' | 'dfs';
  /** Maximum number of hops to consider. Unbounded when omitted. */
  maxLength?: number;
  /** Returns the numeric cost of traversing the given edge. Required when `algorithm` is `'dijkstra'`. */
  weightFn?: (edge: Edge) => number;
}

/**
 * Contract that every graph database provider must implement.
 *
 * @remarks
 * Providers must implement relationship creation and deletion, directed edge
 * queries, graph traversal, pathfinding, statistics, and a health check.
 * The `GraphService` class delegates all operations to the active provider
 * through this interface.
 *
 * @example
 * ```ts
 * class MyProvider implements IGraphProvider {
 *   readonly name = 'my-provider';
 *   async relate(from, edgeTable, to, context, options) { ... }
 *   async unrelate(edgeId, context) { ... }
 *   // ... remaining methods
 * }
 * ```
 */
export interface IGraphProvider {
  /**
   * Get all incoming edges directed at a vertex.
   *
   * @param vertexId - ID of the target vertex
   * @param context - Request context used for correlated logging
   * @param edgeTypes - When provided, only edges belonging to these tables are returned
   * @returns Array of all incoming edges matching the filter, or an empty array if none
   * @throws {Error} If the underlying provider encounters a storage or query error
   *
   * @example
   * ```ts
   * const incoming = await provider.getIncomingEdges('user:bob', context, ['follows']);
   * ```
   */
  getIncomingEdges(
    vertexId: string,
    context: RequestContext,
    edgeTypes?: string[],
  ): Promise<Edge[]>;

  /**
   * Get all outgoing edges originating from a vertex.
   *
   * @param vertexId - ID of the source vertex
   * @param context - Request context used for correlated logging
   * @param edgeTypes - When provided, only edges belonging to these tables are returned
   * @returns Array of all outgoing edges matching the filter, or an empty array if none
   * @throws {Error} If the underlying provider encounters a storage or query error
   *
   * @example
   * ```ts
   * const outgoing = await provider.getOutgoingEdges('user:alice', context, ['follows']);
   * ```
   */
  getOutgoingEdges(
    vertexId: string,
    context: RequestContext,
    edgeTypes?: string[],
  ): Promise<Edge[]>;

  /**
   * Compute aggregate statistics about the current graph.
   *
   * @param context - Request context used for correlated logging
   * @returns Snapshot of vertex/edge counts and per-type breakdowns
   * @throws {Error} If the underlying provider cannot compute statistics
   *
   * @example
   * ```ts
   * const stats = await provider.getStats(context);
   * console.log(stats.vertexCount, stats.avgDegree);
   * ```
   */
  getStats(context: RequestContext): Promise<GraphStats>;

  /**
   * Perform a liveness check on the provider connection.
   *
   * @returns `true` if the provider is reachable and operational, `false` otherwise
   *
   * @example
   * ```ts
   * if (!(await provider.healthCheck())) {
   *   throw new Error('Graph provider is unhealthy');
   * }
   * ```
   */
  healthCheck(): Promise<boolean>;

  /**
   * Human-readable identifier for this provider (e.g. `'mock'`, `'surrealdb'`).
   * Used in logging and diagnostics.
   */
  readonly name: string;

  /**
   * Determine whether any path exists between two vertices without returning it.
   * More efficient than `shortestPath` when only reachability is needed.
   *
   * @param from - ID of the source vertex
   * @param to - ID of the target vertex
   * @param context - Request context used for correlated logging
   * @param maxDepth - Maximum hop count to search. Unbounded when omitted.
   * @returns `true` if at least one path exists within the depth limit
   * @throws {Error} If the underlying provider encounters a storage or query error
   *
   * @example
   * ```ts
   * const connected = await provider.pathExists('user:alice', 'user:charlie', context, 3);
   * ```
   */
  pathExists(
    from: string,
    to: string,
    context: RequestContext,
    maxDepth?: number,
  ): Promise<boolean>;

  /**
   * Create a directed relationship edge between two vertices.
   *
   * @param from - ID of the source vertex
   * @param edgeTable - Table (type) name for the edge (e.g. `'follows'`)
   * @param to - ID of the target vertex
   * @param context - Request context used for correlated logging
   * @param options - Optional payload and duplicate-handling behaviour
   * @returns The newly created edge
   * @throws {Error} If either vertex does not exist, or a duplicate is rejected
   *
   * @example
   * ```ts
   * const edge = await provider.relate('user:alice', 'follows', 'user:bob', context, {
   *   data: { since: '2025-01-01' },
   * });
   * ```
   */
  relate(
    from: string,
    edgeTable: string,
    to: string,
    context: RequestContext,
    options?: RelateOptions,
  ): Promise<Edge>;

  /**
   * Find the lowest-cost path between two vertices using the specified algorithm.
   *
   * @param from - ID of the source vertex
   * @param to - ID of the target vertex
   * @param context - Request context used for correlated logging
   * @param options - Algorithm selection, depth limit, and optional weight function
   * @returns The shortest path, or `null` if no path exists within the constraints
   * @throws {Error} If the underlying provider encounters a storage or query error
   *
   * @example
   * ```ts
   * const path = await provider.shortestPath('user:alice', 'user:charlie', context, {
   *   algorithm: 'bfs',
   *   maxLength: 4,
   * });
   * if (path) console.log(`${path.vertices.length} hops`);
   * ```
   */
  shortestPath(
    from: string,
    to: string,
    context: RequestContext,
    options?: PathOptions,
  ): Promise<GraphPath | null>;

  /**
   * Traverse the graph outward (or inward/both) from a starting vertex.
   *
   * @param startVertexId - ID of the vertex to begin traversal from
   * @param context - Request context used for correlated logging
   * @param options - Direction, depth limit, edge/vertex type filters, and WHERE expression
   * @returns All discovered paths and the resolved start vertex
   * @throws {Error} If the start vertex does not exist or the provider query fails
   *
   * @example
   * ```ts
   * const result = await provider.traverse('user:alice', context, {
   *   maxDepth: 2,
   *   edgeTypes: ['follows'],
   *   direction: 'out',
   * });
   * console.log(`Found ${result.paths.length} paths`);
   * ```
   */
  traverse(
    startVertexId: string,
    context: RequestContext,
    options?: TraversalOptions,
  ): Promise<TraversalResult>;

  /**
   * Delete a relationship edge by its ID.
   *
   * @param edgeId - ID of the edge to remove
   * @param context - Request context used for correlated logging
   * @returns `true` if the edge was found and deleted, `false` if it did not exist
   * @throws {Error} If the underlying provider encounters a storage error
   *
   * @example
   * ```ts
   * const deleted = await provider.unrelate('follows:1', context);
   * ```
   */
  unrelate(edgeId: string, context: RequestContext): Promise<boolean>;
}
