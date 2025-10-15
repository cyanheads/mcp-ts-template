/**
 * @fileoverview Graph operations for SurrealDB storage provider.
 * Provides RELATE statements and graph traversal utilities.
 * @module src/storage/providers/surrealdb/graph/graphOperations
 */

import type Surreal from 'surrealdb';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import type { Edge, Vertex } from './graphTypes.js';

/**
 * Graph operations manager for SurrealDB.
 *
 * @remarks
 * Implements SurrealDB's native graph capabilities:
 * - RELATE statement for edge creation
 * - Graph traversal operators (->, <-, <->)
 * - Multi-hop traversal
 * - Edge filtering and metadata
 */
export class GraphOperations {
  constructor(private readonly client: Surreal) {}

  /**
   * Create a graph edge using RELATE statement.
   *
   * @param from - Source vertex record ID
   * @param edgeTable - Edge table name
   * @param to - Target vertex record ID
   * @param data - Edge metadata
   * @param context - Request context
   * @returns Created edge
   *
   * @example
   * ```ts
   * const edge = await graphOps.createEdge(
   *   'user:alice',
   *   'follows',
   *   'user:bob',
   *   { since: '2025-01-01', weight: 1 },
   *   context
   * );
   * ```
   */
  async createEdge(
    from: string,
    edgeTable: string,
    to: string,
    data: Record<string, unknown>,
    context: RequestContext,
  ): Promise<Edge> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.debug(
          `[GraphOperations] Creating edge: ${from} -[${edgeTable}]-> ${to}`,
          context,
        );

        // Build SET clause from data
        const setClause = Object.keys(data).length
          ? `SET ${Object.keys(data)
              .map((key) => `${key} = $data.${key}`)
              .join(', ')}`
          : '';

        const query = `
          RELATE $from->${edgeTable}->$to
          ${setClause}
          RETURN AFTER
        `;

        const result = await this.client.query<[{ result: Edge[] }]>(query, {
          from,
          to,
          data,
        });

        const edge = result[0]?.result?.[0];

        if (!edge) {
          throw new McpError(
            JsonRpcErrorCode.InternalError,
            'Failed to create edge',
            context,
          );
        }

        return edge;
      },
      {
        operation: 'GraphOperations.createEdge',
        context,
        input: { from, edgeTable, to },
      },
    );
  }

  /**
   * Traverse graph outward from a vertex.
   *
   * @param startId - Starting vertex ID
   * @param depth - Number of hops (default: 1)
   * @param edgeFilter - Optional edge table filter
   * @param context - Request context
   * @returns Connected vertices
   *
   * @example
   * ```ts
   * // Get all users that alice follows
   * const following = await graphOps.traverseOut('user:alice', context, 1, 'follows');
   *
   * // Get friends of friends (2 hops)
   * const friendsOfFriends = await graphOps.traverseOut('user:alice', context, 2, 'friend');
   * ```
   */
  async traverseOut(
    startId: string,
    context: RequestContext,
    depth: number = 1,
    edgeFilter?: string,
  ): Promise<Vertex[]> {
    return ErrorHandler.tryCatch(
      async () => {
        // Build traversal operator (-> for each depth)
        const operator = '->'.repeat(depth);
        const filter = edgeFilter
          ? `[WHERE meta::tb(id) = '${edgeFilter}']`
          : '';

        const query = `
          SELECT ${operator}${filter} as connections
          FROM $startId
        `;

        const result = await this.client.query<
          [{ result: Array<{ connections: Vertex[] }> }]
        >(query, { startId });

        const connections = result[0]?.result?.[0]?.connections ?? [];
        return Array.isArray(connections) ? connections : [connections];
      },
      {
        operation: 'GraphOperations.traverseOut',
        context,
        input: { startId, depth, edgeFilter },
      },
    );
  }

  /**
   * Traverse graph inward to a vertex.
   *
   * @param startId - Starting vertex ID
   * @param depth - Number of hops (default: 1)
   * @param edgeFilter - Optional edge table filter
   * @param context - Request context
   * @returns Connected vertices
   */
  async traverseIn(
    startId: string,
    context: RequestContext,
    depth: number = 1,
    edgeFilter?: string,
  ): Promise<Vertex[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const operator = '<-'.repeat(depth);
        const filter = edgeFilter
          ? `[WHERE meta::tb(id) = '${edgeFilter}']`
          : '';

        const query = `
          SELECT ${operator}${filter} as connections
          FROM $startId
        `;

        const result = await this.client.query<
          [{ result: Array<{ connections: Vertex[] }> }]
        >(query, { startId });

        const connections = result[0]?.result?.[0]?.connections ?? [];
        return Array.isArray(connections) ? connections : [connections];
      },
      {
        operation: 'GraphOperations.traverseIn',
        context,
        input: { startId, depth, edgeFilter },
      },
    );
  }

  /**
   * Traverse graph bidirectionally.
   *
   * @param startId - Starting vertex ID
   * @param depth - Number of hops (default: 1)
   * @param edgeFilter - Optional edge table filter
   * @param context - Request context
   * @returns Connected vertices
   */
  async traverseBoth(
    startId: string,
    context: RequestContext,
    depth: number = 1,
    edgeFilter?: string,
  ): Promise<Vertex[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const operator = '<->'.repeat(depth);
        const filter = edgeFilter
          ? `[WHERE meta::tb(id) = '${edgeFilter}']`
          : '';

        const query = `
          SELECT ${operator}${filter} as connections
          FROM $startId
        `;

        const result = await this.client.query<
          [{ result: Array<{ connections: Vertex[] }> }]
        >(query, { startId });

        const connections = result[0]?.result?.[0]?.connections ?? [];
        return Array.isArray(connections) ? connections : [connections];
      },
      {
        operation: 'GraphOperations.traverseBoth',
        context,
        input: { startId, depth, edgeFilter },
      },
    );
  }

  /**
   * Delete an edge by ID.
   *
   * @param edgeId - Edge record ID
   * @param context - Request context
   * @returns True if deleted
   */
  async deleteEdge(edgeId: string, context: RequestContext): Promise<boolean> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = 'DELETE $edgeId RETURN BEFORE';

        const result = await this.client.query<[{ result: Edge[] }]>(query, {
          edgeId,
        });

        return (result[0]?.result?.length ?? 0) > 0;
      },
      {
        operation: 'GraphOperations.deleteEdge',
        context,
        input: { edgeId },
      },
    );
  }
}
