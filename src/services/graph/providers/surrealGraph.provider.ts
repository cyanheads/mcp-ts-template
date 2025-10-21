/**
 * @fileoverview SurrealDB implementation of the graph provider interface.
 * Implements graph operations using SurrealDB's RELATE and graph traversal features.
 * @module src/services/graph/providers/surrealGraph.provider
 */

import { inject, injectable } from 'tsyringe';
import type Surreal from 'surrealdb';

import { SurrealdbClient } from '@/container/tokens.js';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import {
  ErrorHandler,
  logger,
  type RequestContext,
  isRecord,
} from '@/utils/index.js';
import type {
  IGraphProvider,
  Edge,
  GraphPath,
  TraversalResult,
  RelateOptions,
  TraversalOptions,
  PathOptions,
} from '../core/IGraphProvider.js';
import type { GraphStats } from '../types.js';

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
        const operator = this.getTraversalOperator(direction);

        // Build edge filter
        const edgeFilter = options?.edgeTypes?.length
          ? options.edgeTypes.join('|')
          : '';
        // Note: vertexTypes filtering would require more complex query structure
        // and is left for future enhancement
        const whereClause = options?.where ? `WHERE ${options.where}` : '';

        // Build the path expression
        // For simple cases, use depth range syntax: 1..maxDepth
        const simplePath = edgeFilter
          ? `1..${maxDepth}${operator}${edgeFilter}`
          : `1..${maxDepth}${operator}`;

        const query = `
          SELECT
            *,
            (SELECT * FROM ONLY $startVertex) as startNode,
            ${simplePath} as paths
          FROM $startVertex
          ${whereClause}
        `;

        logger.debug(
          `[SurrealGraphProvider] Traversing from ${startVertexId} with depth ${maxDepth}`,
          context,
        );

        const result = await this.client.query<
          [
            {
              result: Array<{
                startNode: Record<string, unknown>;
                paths: Array<Record<string, unknown>> | Record<string, unknown>;
              }>;
            },
          ]
        >(query, { startVertex: startVertexId });

        const data = result[0]?.result?.[0];

        if (!data?.startNode) {
          throw new McpError(
            JsonRpcErrorCode.InvalidParams,
            `Vertex not found: ${startVertexId}`,
            context,
          );
        }

        // Convert startNode to Vertex format
        const startVertex = {
          id: (data.startNode.id as string) || startVertexId,
          table: this.extractTableName(
            (data.startNode.id as string) || startVertexId,
          ),
          data: Object.fromEntries(
            Object.entries(data.startNode).filter(([key]) => key !== 'id'),
          ),
        };

        // Parse paths - SurrealDB returns either an array of nodes or nested structure
        const pathsArray = Array.isArray(data.paths)
          ? data.paths
          : data.paths
            ? [data.paths]
            : [];

        const parsedPaths: GraphPath[] = [];

        // Process each path
        for (const pathElement of pathsArray) {
          if (typeof pathElement === 'object' && pathElement !== null) {
            const graphPath: GraphPath = { vertices: [], edges: [] };

            // Handle both flat and nested structures
            const elements = Array.isArray(pathElement)
              ? pathElement
              : [pathElement];

            for (const element of elements) {
              if (isRecord(element)) {
                // Check if it's an edge (has 'in' and 'out' properties)
                if ('in' in element && 'out' in element) {
                  const elementId =
                    typeof element.id === 'string'
                      ? element.id
                      : String(element.id);
                  const elementOut =
                    typeof element.out === 'string'
                      ? element.out
                      : String(element.out);
                  const elementIn =
                    typeof element.in === 'string'
                      ? element.in
                      : String(element.in);

                  const edge: Edge = {
                    id: elementId || '',
                    table: this.extractTableName(elementId || ''),
                    from: elementOut || '',
                    to: elementIn || '',
                    data: Object.fromEntries(
                      Object.entries(element).filter(
                        ([key]) => !['id', 'in', 'out'].includes(key),
                      ),
                    ),
                  };
                  graphPath.edges.push(edge);
                } else {
                  // It's a vertex
                  const elementId =
                    typeof element.id === 'string'
                      ? element.id
                      : String(element.id);

                  const vertex = {
                    id: elementId || '',
                    table: this.extractTableName(elementId || ''),
                    data: Object.fromEntries(
                      Object.entries(element).filter(([key]) => key !== 'id'),
                    ),
                  };
                  graphPath.vertices.push(vertex);
                }
              }
            }

            // Only add paths that have content
            if (graphPath.vertices.length > 0 || graphPath.edges.length > 0) {
              parsedPaths.push(graphPath);
            }
          }
        }

        logger.debug(
          `[SurrealGraphProvider] Found ${parsedPaths.length} paths from ${startVertexId}`,
          context,
        );

        return {
          start: startVertex,
          paths: parsedPaths,
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
        // Use SurrealDB's built-in shortest path function
        const query = 'SELECT graph::shortest_path($from, $to) AS path;';

        const result = await this.client.query<
          [{ result: Array<{ path: Array<Record<string, unknown>> | null }> }]
        >(query, { from, to });

        const pathData = result[0]?.result?.[0]?.path;

        if (!pathData || pathData.length === 0) {
          logger.debug(
            `[SurrealGraphProvider] No path found from ${from} to ${to}`,
            context,
          );
          return null;
        }

        // Parse the mixed array of vertices and edges into a GraphPath object
        const graphPath: GraphPath = {
          vertices: [],
          edges: [],
          weight: pathData.length - 1, // Simple weight based on hop count
        };

        for (const element of pathData) {
          // Edges have 'in' and 'out' properties in SurrealDB
          if ('in' in element && 'out' in element) {
            const elementId =
              typeof element.id === 'string' ? element.id : String(element.id);
            const elementOut =
              typeof element.out === 'string'
                ? element.out
                : String(element.out);
            const elementIn =
              typeof element.in === 'string' ? element.in : String(element.in);

            const edge: Edge = {
              id: elementId || '',
              table: this.extractTableName(elementId || ''),
              from: elementOut || '',
              to: elementIn || '',
              data: Object.fromEntries(
                Object.entries(element).filter(
                  ([key]) => !['id', 'in', 'out'].includes(key),
                ),
              ),
            };
            graphPath.edges.push(edge);
          } else {
            // It's a vertex
            const elementId =
              typeof element.id === 'string' ? element.id : String(element.id);

            const vertex = {
              id: elementId || '',
              table: this.extractTableName(elementId || ''),
              data: Object.fromEntries(
                Object.entries(element).filter(([key]) => key !== 'id'),
              ),
            };
            graphPath.vertices.push(vertex);
          }
        }

        logger.debug(
          `[SurrealGraphProvider] Found path from ${from} to ${to} with ${graphPath.vertices.length} vertices and ${graphPath.edges.length} edges`,
          context,
        );

        return graphPath;
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
    edgeTypes?: string[],
  ): Promise<Edge[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const edgeFilter = edgeTypes?.length ? edgeTypes.join('|') : '';
        const query = `SELECT ->${edgeFilter} as edges FROM ONLY $vertexId`;

        const result = await this.client.query<
          [{ result: Array<{ edges: Edge[] }> }]
        >(query, { vertexId });

        const edges = result[0]?.result?.[0]?.edges ?? [];
        return Array.isArray(edges) ? edges : []; // Ensure result is always an array
      },
      {
        operation: 'SurrealGraphProvider.getOutgoingEdges',
        context,
        input: { vertexId, edgeTypes },
      },
    );
  }

  async getIncomingEdges(
    vertexId: string,
    context: RequestContext,
    edgeTypes?: string[],
  ): Promise<Edge[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const edgeFilter = edgeTypes?.length ? edgeTypes.join('|') : '';
        const query = `SELECT <-${edgeFilter} as edges FROM ONLY $vertexId`;

        const result = await this.client.query<
          [{ result: Array<{ edges: Edge[] }> }]
        >(query, { vertexId });

        const edges = result[0]?.result?.[0]?.edges ?? [];
        return Array.isArray(edges) ? edges : []; // Ensure result is always an array
      },
      {
        operation: 'SurrealGraphProvider.getIncomingEdges',
        context,
        input: { vertexId, edgeTypes },
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
        // Use the efficient path finding function and check for existence
        const query = 'SELECT graph::shortest_path($from, $to) AS path;';
        const result = await this.client.query<
          [{ result: Array<{ path: unknown[] | null }> }]
        >(query, { from, to });

        const path = result[0]?.result?.[0]?.path;
        // Check if path exists and respects maxDepth
        // Path length = vertices + edges, so for maxDepth hops, max length is (maxDepth * 2 + 1)
        return (
          path !== null && path !== undefined && path.length <= maxDepth * 2 + 1
        );
      },
      {
        operation: 'SurrealGraphProvider.pathExists',
        context,
        input: { from, to, maxDepth },
      },
    );
  }

  async getStats(context: RequestContext): Promise<GraphStats> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.debug(
          '[SurrealGraphProvider] Getting graph statistics',
          context,
        );

        // Get database info to list all tables
        const infoResult = await this.client.query<
          [
            {
              result: Array<{
                tables: Record<
                  string,
                  {
                    drop: boolean;
                    full: boolean;
                    kind: string;
                    permissions: Record<string, unknown>;
                  }
                >;
              }>;
            },
          ]
        >('INFO FOR DB;');

        const tables = infoResult[0]?.result?.[0]?.tables ?? {};

        const vertexTypes: Record<string, number> = {};
        const edgeTypes: Record<string, number> = {};
        let vertexCount = 0;
        let edgeCount = 0;

        // Query each table to determine if it's a vertex or edge table
        const countPromises = Object.keys(tables).map(async (tableName) => {
          try {
            // Check if table has IN/OUT fields (edge table)
            // Query a sample record to check structure
            const sampleQuery = `SELECT * FROM ${tableName} LIMIT 1;`;
            const sampleResult =
              await this.client.query<
                [{ result: Array<Record<string, unknown>> }]
              >(sampleQuery);
            const sample = sampleResult[0]?.result?.[0];

            const isEdge = sample && 'in' in sample && 'out' in sample;

            // Count records in this table
            const countQuery = `SELECT count() FROM ${tableName} GROUP ALL;`;
            const countResult =
              await this.client.query<[{ result: Array<{ count: number }> }]>(
                countQuery,
              );
            const count = countResult[0]?.result?.[0]?.count ?? 0;

            if (isEdge) {
              edgeTypes[tableName] = count;
              edgeCount += count;
            } else {
              vertexTypes[tableName] = count;
              vertexCount += count;
            }
          } catch (error: unknown) {
            // If there's an error querying this table, log and continue
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            logger.debug(
              `[SurrealGraphProvider] Error querying table ${tableName}: ${errorMessage}`,
              context,
            );
          }
        });

        await Promise.all(countPromises);

        const stats: GraphStats = {
          vertexCount,
          edgeCount,
          avgDegree: vertexCount > 0 ? edgeCount / vertexCount : 0,
          vertexTypes,
          edgeTypes,
        };

        logger.debug(
          `[SurrealGraphProvider] Graph stats: ${vertexCount} vertices, ${edgeCount} edges`,
          context,
        );

        return stats;
      },
      {
        operation: 'SurrealGraphProvider.getStats',
        context,
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
