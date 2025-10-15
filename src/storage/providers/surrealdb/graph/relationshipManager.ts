/**
 * @fileoverview Relationship manager for edge CRUD operations.
 * Manages graph relationships with metadata and constraints.
 * @module src/storage/providers/surrealdb/graph/relationshipManager
 */

import type Surreal from 'surrealdb';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import type { Edge, EdgeOptions } from './graphTypes.js';

/**
 * Manages relationships (edges) in the graph.
 *
 * @remarks
 * Provides high-level operations for:
 * - Creating relationships with metadata
 * - Updating edge properties
 * - Querying relationships
 * - Deleting edges
 */
export class RelationshipManager {
  constructor(private readonly client: Surreal) {}

  /**
   * Create a new relationship.
   *
   * @param from - Source vertex ID
   * @param edgeTable - Edge table/type
   * @param to - Target vertex ID
   * @param context - Request context
   * @param options - Edge options
   * @returns Created edge
   */
  async create(
    from: string,
    edgeTable: string,
    to: string,
    context: RequestContext,
    options?: EdgeOptions,
  ): Promise<Edge> {
    return ErrorHandler.tryCatch(
      async () => {
        // Check for duplicates if not allowed
        if (!options?.allowDuplicates) {
          const exists = await this.exists(from, edgeTable, to, context);
          if (exists) {
            throw new McpError(
              JsonRpcErrorCode.InvalidParams,
              `Relationship already exists: ${from} -[${edgeTable}]-> ${to}`,
              context,
            );
          }
        }

        const setClause = options?.data
          ? `SET ${Object.keys(options.data)
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
          data: options?.data || {},
        });

        const edge = result[0]?.result?.[0];

        if (!edge) {
          throw new McpError(
            JsonRpcErrorCode.InternalError,
            'Failed to create relationship',
            context,
          );
        }

        logger.debug(`[RelationshipManager] Created edge: ${edge.id}`, context);

        // Create bidirectional if requested
        if (options?.bidirectional) {
          const reverseOptions: EdgeOptions = {
            allowDuplicates: true, // Already checked above
          };
          if (options.data) {
            reverseOptions.data = options.data;
          }
          await this.create(to, edgeTable, from, context, reverseOptions);
        }

        return edge;
      },
      {
        operation: 'RelationshipManager.create',
        context,
        input: { from, edgeTable, to },
      },
    );
  }

  /**
   * Check if a relationship exists.
   *
   * @param from - Source vertex ID
   * @param edgeTable - Edge table/type
   * @param to - Target vertex ID
   * @param context - Request context
   * @returns True if exists
   */
  async exists(
    from: string,
    edgeTable: string,
    to: string,
    context: RequestContext,
  ): Promise<boolean> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = `
          SELECT count() as count
          FROM ${edgeTable}
          WHERE in = $from AND out = $to
        `;

        const result = await this.client.query<
          [{ result: Array<{ count: number }> }]
        >(query, { from, to });

        const count = result[0]?.result?.[0]?.count ?? 0;
        return count > 0;
      },
      {
        operation: 'RelationshipManager.exists',
        context,
        input: { from, edgeTable, to },
      },
    );
  }

  /**
   * Update edge metadata.
   *
   * @param edgeId - Edge record ID
   * @param data - Updated metadata
   * @param context - Request context
   * @returns Updated edge
   */
  async updateMetadata(
    edgeId: string,
    data: Record<string, unknown>,
    context: RequestContext,
  ): Promise<Edge> {
    return ErrorHandler.tryCatch(
      async () => {
        const setClause = Object.keys(data)
          .map((key) => `${key} = $data.${key}`)
          .join(', ');

        const query = `
          UPDATE $edgeId
          SET ${setClause}
          RETURN AFTER
        `;

        const result = await this.client.query<[{ result: Edge[] }]>(query, {
          edgeId,
          data,
        });

        const edge = result[0]?.result?.[0];

        if (!edge) {
          throw new McpError(
            JsonRpcErrorCode.InvalidParams,
            `Edge not found: ${edgeId}`,
            context,
          );
        }

        return edge;
      },
      {
        operation: 'RelationshipManager.updateMetadata',
        context,
        input: { edgeId },
      },
    );
  }

  /**
   * Delete a relationship.
   *
   * @param edgeId - Edge record ID
   * @param context - Request context
   * @returns True if deleted
   */
  async delete(edgeId: string, context: RequestContext): Promise<boolean> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = 'DELETE $edgeId RETURN BEFORE';

        const result = await this.client.query<[{ result: Edge[] }]>(query, {
          edgeId,
        });

        return (result[0]?.result?.length ?? 0) > 0;
      },
      {
        operation: 'RelationshipManager.delete',
        context,
        input: { edgeId },
      },
    );
  }

  /**
   * Get all edges of a specific type.
   *
   * @param edgeTable - Edge table name
   * @param context - Request context
   * @param limit - Maximum results (default: 100)
   * @returns Array of edges
   */
  async getAllOfType(
    edgeTable: string,
    context: RequestContext,
    limit: number = 100,
  ): Promise<Edge[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = `SELECT * FROM ${edgeTable} LIMIT $limit`;

        const result = await this.client.query<[{ result: Edge[] }]>(query, {
          limit,
        });

        return result[0]?.result ?? [];
      },
      {
        operation: 'RelationshipManager.getAllOfType',
        context,
        input: { edgeTable, limit },
      },
    );
  }
}
