/**
 * @fileoverview Graph service orchestrator.
 * Manages graph database operations with provider abstraction.
 * @module src/services/graph/core/GraphService
 */

import { logger, type RequestContext } from '@/utils/index.js';
import type { IGraphProvider } from './IGraphProvider.js';
import type {
  Edge,
  GraphPath,
  TraversalResult,
  RelateOptions,
  TraversalOptions,
  PathOptions,
} from './IGraphProvider.js';
import type { GraphStats } from '../types.js';

/**
 * Service for managing graph database operations.
 *
 * @remarks
 * Provides a unified interface for graph operations across different providers.
 * Currently supports SurrealDB as the primary graph backend.
 *
 * @example
 * ```ts
 * const graphService = new GraphService(surrealGraphProvider);
 *
 * // Create a relationship
 * const edge = await graphService.relate(
 *   'user:alice',
 *   'follows',
 *   'user:bob',
 *   context,
 *   { data: { since: '2025-01-01' } }
 * );
 *
 * // Traverse the graph
 * const result = await graphService.traverse('user:alice', context, {
 *   maxDepth: 2,
 *   edgeTypes: ['follows']
 * });
 * ```
 */
export class GraphService {
  constructor(private readonly provider: IGraphProvider) {
    logger.info(`Graph service initialized with provider: ${provider.name}`);
  }

  /**
   * Get the underlying provider.
   */
  getProvider(): IGraphProvider {
    return this.provider;
  }

  /**
   * Create a relationship between two vertices.
   *
   * @param from - Source vertex ID
   * @param edgeTable - Edge table/type name
   * @param to - Target vertex ID
   * @param context - Request context
   * @param options - Relationship options
   * @returns The created edge
   */
  async relate(
    from: string,
    edgeTable: string,
    to: string,
    context: RequestContext,
    options?: RelateOptions,
  ): Promise<Edge> {
    logger.debug(
      `[GraphService] Creating relationship: ${from} -[${edgeTable}]-> ${to}`,
      context,
    );

    return this.provider.relate(from, edgeTable, to, context, options);
  }

  /**
   * Delete a relationship.
   *
   * @param edgeId - Edge identifier
   * @param context - Request context
   * @returns True if deleted
   */
  async unrelate(edgeId: string, context: RequestContext): Promise<boolean> {
    logger.debug(`[GraphService] Deleting relationship: ${edgeId}`, context);

    return this.provider.unrelate(edgeId, context);
  }

  /**
   * Traverse the graph from a starting vertex.
   *
   * @param startVertexId - Starting vertex ID
   * @param context - Request context
   * @param options - Traversal options
   * @returns Traversal result with paths
   */
  async traverse(
    startVertexId: string,
    context: RequestContext,
    options?: TraversalOptions,
  ): Promise<TraversalResult> {
    logger.debug(`[GraphService] Traversing from: ${startVertexId}`, context);

    return this.provider.traverse(startVertexId, context, options);
  }

  /**
   * Find the shortest path between two vertices.
   *
   * @param from - Source vertex ID
   * @param to - Target vertex ID
   * @param context - Request context
   * @param options - Pathfinding options
   * @returns Shortest path or null
   */
  async shortestPath(
    from: string,
    to: string,
    context: RequestContext,
    options?: PathOptions,
  ): Promise<GraphPath | null> {
    logger.debug(
      `[GraphService] Finding shortest path: ${from} -> ${to}`,
      context,
    );

    return this.provider.shortestPath(from, to, context, options);
  }

  /**
   * Get outgoing edges from a vertex.
   *
   * @param vertexId - Vertex identifier
   * @param context - Request context
   * @param edgeTypes - Optional edge type filter
   * @returns Array of outgoing edges
   */
  async getOutgoingEdges(
    vertexId: string,
    context: RequestContext,
    edgeTypes?: string[],
  ): Promise<Edge[]> {
    return this.provider.getOutgoingEdges(vertexId, context, edgeTypes);
  }

  /**
   * Get incoming edges to a vertex.
   *
   * @param vertexId - Vertex identifier
   * @param context - Request context
   * @param edgeTypes - Optional edge type filter
   * @returns Array of incoming edges
   */
  async getIncomingEdges(
    vertexId: string,
    context: RequestContext,
    edgeTypes?: string[],
  ): Promise<Edge[]> {
    return this.provider.getIncomingEdges(vertexId, context, edgeTypes);
  }

  /**
   * Check if a path exists between two vertices.
   *
   * @param from - Source vertex ID
   * @param to - Target vertex ID
   * @param context - Request context
   * @param maxDepth - Maximum depth to search
   * @returns True if path exists
   */
  async pathExists(
    from: string,
    to: string,
    context: RequestContext,
    maxDepth?: number,
  ): Promise<boolean> {
    return this.provider.pathExists(from, to, context, maxDepth);
  }

  /**
   * Get statistics about the graph.
   *
   * @param context - Request context
   * @returns Graph statistics including vertex/edge counts and type distributions
   */
  async getStats(context: RequestContext): Promise<GraphStats> {
    logger.debug('[GraphService] Getting graph statistics', context);
    return this.provider.getStats(context);
  }

  /**
   * Health check for the graph provider.
   *
   * @returns True if provider is healthy
   */
  async healthCheck(): Promise<boolean> {
    return this.provider.healthCheck();
  }
}
