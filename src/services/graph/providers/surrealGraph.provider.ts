/**
 * @fileoverview SurrealDB implementation of the graph provider interface.
 * Implements graph operations using SurrealDB's RELATE and graph traversal features.
 * @module src/services/graph/providers/surrealGraph.provider
 */

import { inject, injectable } from 'tsyringe';
import type Surreal from 'surrealdb';

import { SurrealdbClient } from '@/container/tokens.js';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';
import type {
  IGraphProvider,
  Edge,
  GraphPath,
  TraversalResult,
  RelateOptions,
  TraversalOptions,
  PathOptions,
} from '../core/IGraphProvider.js';

/**
 * SurrealDB graph provider implementation.
 *
 * @remarks
 * Uses SurrealDB's native graph features:
 * - RELATE statement for creating edges
 * - Graph traversal operators (->, <-, <->)
 * - Path finding algorithms
 */
@injectable()
export class SurrealGraphProvider implements IGraphProvider {
  readonly name = 'surrealdb-graph';

  constructor(@inject(SurrealdbClient) private readonly client: Surreal) {}

  async relate(
    from: string,
    edgeTable: string,
    to: string,
    context: RequestContext,
    options?: RelateOptions,
  ): Promise<Edge> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.debug(
          `[SurrealGraphProvider] Creating edge: ${from} -[${edgeTable}]-> ${to}`,
          context,
        );

        // Build RELATE query
        const dataClause = options?.data
          ? `SET ${Object.entries(options.data)
              .map(([key, _]) => `${key} = $${key}`)
              .join(', ')}`
          : '';

        const query = `
          RELATE $from->${edgeTable}->$to
          ${dataClause}
          RETURN AFTER
        `;

        const params: Record<string, unknown> = {
          from,
          to,
          ...(options?.data || {}),
        };

        const result = await this.client.query<[{ result: Edge[] }]>(
          query,
          params,
        );

        const edge = result[0]?.result?.[0];

        if (!edge) {
          throw new McpError(
            JsonRpcErrorCode.InternalError,
            'Failed to create relationship',
            context,
          );
        }

        logger.debug(
          `[SurrealGraphProvider] Edge created: ${edge.id}`,
          context,
        );

        return edge;
      },
      {
        operation: 'SurrealGraphProvider.relate',
        context,
        input: { from, edgeTable, to },
      },
    );
  }

  async unrelate(edgeId: string, context: RequestContext): Promise<boolean> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = 'DELETE $edgeId RETURN BEFORE';

        const result = await this.client.query<[{ result: Edge[] }]>(query, {
          edgeId,
        });

        const deleted = result[0]?.result?.[0];
        return deleted !== undefined;
      },
      {
        operation: 'SurrealGraphProvider.unrelate',
        context,
        input: { edgeId },
      },
    );
  }

  async traverse(
    startVertexId: string,
    context: RequestContext,
    options?: TraversalOptions,
  ): Promise<TraversalResult> {
    return ErrorHandler.tryCatch(
      async () => {
        const maxDepth = options?.maxDepth ?? 1;
        const direction = options?.direction ?? 'out';

        // Build traversal operator
        const operator = this.getTraversalOperator(direction);

        // Build WHERE clause if needed
        const whereClause = options?.where ? `WHERE ${options.where}` : '';

        // For multi-hop traversal, use recursive traversal syntax
        const depthOperator =
          maxDepth > 1 ? `${operator.repeat(maxDepth)}` : operator;

        const query = `
          SELECT
            id,
            ${depthOperator} as connections
          FROM $startVertex
          ${whereClause}
        `;

        const result = await this.client.query<
          [
            {
              result: Array<{
                id: string;
                connections: unknown[];
              }>;
            },
          ]
        >(query, {
          startVertex: startVertexId,
        });

        const data = result[0]?.result?.[0];

        if (!data) {
          throw new McpError(
            JsonRpcErrorCode.InvalidParams,
            `Vertex not found: ${startVertexId}`,
            context,
          );
        }

        // Transform result into TraversalResult format
        // This is simplified - full implementation would parse the connections
        return {
          start: {
            id: startVertexId,
            table: this.extractTableName(startVertexId),
            data: {},
          },
          paths: [], // TODO: Parse connections into paths
        };
      },
      {
        operation: 'SurrealGraphProvider.traverse',
        context,
        input: { startVertexId, options },
      },
    );
  }

  async shortestPath(
    from: string,
    to: string,
    context: RequestContext,
    _options?: PathOptions,
  ): Promise<GraphPath | null> {
    return ErrorHandler.tryCatch(
      async () => {
        // Use recursive traversal to find paths
        const query = `
          SELECT * FROM (
            SELECT
              id,
              ->->->->->->->->->-> as paths
            FROM $from
          )
          WHERE $to IN paths..id
          LIMIT 1
        `;

        const result = await this.client.query<[{ result: unknown[] }]>(query, {
          from,
          to,
        });

        const data = result[0]?.result;

        if (!data || data.length === 0) {
          return null;
        }

        // TODO: Parse result into GraphPath format
        return {
          vertices: [],
          edges: [],
        };
      },
      {
        operation: 'SurrealGraphProvider.shortestPath',
        context,
        input: { from, to },
      },
    );
  }

  async getOutgoingEdges(
    vertexId: string,
    context: RequestContext,
    _edgeTypes?: string[],
  ): Promise<Edge[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = `
          SELECT -> as edges FROM $vertexId
        `;

        const result = await this.client.query<
          [{ result: Array<{ edges: Edge[] }> }]
        >(query, { vertexId });

        const edges = result[0]?.result?.[0]?.edges ?? [];
        return edges;
      },
      {
        operation: 'SurrealGraphProvider.getOutgoingEdges',
        context,
        input: { vertexId },
      },
    );
  }

  async getIncomingEdges(
    vertexId: string,
    context: RequestContext,
    _edgeTypes?: string[],
  ): Promise<Edge[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = `SELECT <- as edges FROM $vertexId`;

        const result = await this.client.query<
          [{ result: Array<{ edges: Edge[] }> }]
        >(query, { vertexId });

        const edges = result[0]?.result?.[0]?.edges ?? [];
        return edges;
      },
      {
        operation: 'SurrealGraphProvider.getIncomingEdges',
        context,
        input: { vertexId },
      },
    );
  }

  async pathExists(
    from: string,
    to: string,
    context: RequestContext,
    maxDepth: number = 5,
  ): Promise<boolean> {
    return ErrorHandler.tryCatch(
      async () => {
        const path = await this.shortestPath(from, to, context, {
          maxLength: maxDepth,
        });
        return path !== null;
      },
      {
        operation: 'SurrealGraphProvider.pathExists',
        context,
        input: { from, to, maxDepth },
      },
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.query('SELECT 1 as healthy');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get traversal operator based on direction.
   */
  private getTraversalOperator(direction: 'out' | 'in' | 'both'): string {
    switch (direction) {
      case 'out':
        return '->';
      case 'in':
        return '<-';
      case 'both':
        return '<->';
      default:
        return '->';
    }
  }

  /**
   * Extract table name from a record ID.
   */
  private extractTableName(recordId: string): string {
    const parts = recordId.split(':');
    return parts[0] || '';
  }
}
