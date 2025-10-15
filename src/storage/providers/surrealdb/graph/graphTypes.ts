/**
 * @fileoverview Type definitions for SurrealDB graph operations.
 * @module src/storage/providers/surrealdb/graph/graphTypes
 */

/**
 * Represents a vertex (node) in the graph.
 */
export interface Vertex {
  /** Unique record ID */
  id: string;
  /** Table name */
  table: string;
  /** Vertex data/properties */
  data: Record<string, unknown>;
}

/**
 * Represents an edge (relationship) in the graph.
 */
export interface Edge {
  /** Unique edge ID */
  id: string;
  /** Edge table name */
  table: string;
  /** Source vertex ID (in property) */
  in: string;
  /** Target vertex ID (out property) */
  out: string;
  /** Alternate source property */
  from?: string;
  /** Alternate target property */
  to?: string;
  /** Edge metadata/properties */
  data?: Record<string, unknown>;
}

/**
 * Edge creation options.
 */
export interface EdgeOptions {
  /** Edge metadata */
  data?: Record<string, unknown>;
  /** Whether to allow duplicate edges */
  allowDuplicates?: boolean;
  /** Whether to create bidirectional edge */
  bidirectional?: boolean;
}

/**
 * Graph query result.
 */
export interface GraphQueryResult<T = unknown> {
  /** Query results */
  result: T;
  /** Query execution time */
  time?: string;
  /** Query status */
  status?: string;
}
