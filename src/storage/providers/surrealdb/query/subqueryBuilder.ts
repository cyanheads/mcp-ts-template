/**
 * @fileoverview Subquery builder for nested SurrealQL queries.
 * Enables complex data retrieval with nested SELECT statements.
 * @module src/storage/providers/surrealdb/query/subqueryBuilder
 */

import { SelectQueryBuilder } from '../core/queryBuilder.js';

/**
 * Subquery context for nested queries.
 */
export interface SubqueryContext {
  /** Alias for the subquery result */
  alias?: string;
  /** Whether to wrap in parentheses */
  wrapped?: boolean;
}

/**
 * Builder for subqueries within SELECT statements.
 *
 * @remarks
 * Supports nested queries for:
 * - Filtering by results of another query
 * - Computed fields
 * - Complex joins
 * - Aggregate calculations
 *
 * @example
 * ```ts
 * // Select users who have more than 5 posts
 * const query = select('*')
 *   .from('user')
 *   .where(w => w.raw(
 *     '(SELECT count() FROM post WHERE author = parent.id)[0].count > 5'
 *   ));
 * ```
 */
export class SubqueryBuilder extends SelectQueryBuilder {
  /**
   * Set the parent query alias for referencing in subquery.
   * Note: This is reserved for future use with correlated subqueries.
   */
  withParentAlias(_alias: string): this {
    return this;
  }

  /**
   * Build a subquery as a string (for embedding in other queries).
   */
  buildSubquery(context?: SubqueryContext): string {
    const { query } = this.build();

    if (context?.wrapped !== false) {
      return `(${query})${context?.alias ? ` as ${context.alias}` : ''}`;
    }

    return query;
  }

  /**
   * Create a subquery for use in WHERE clauses.
   *
   * @param builder - Function to build the subquery
   * @returns SQL string for the subquery
   *
   * @example
   * ```ts
   * const subquery = SubqueryBuilder.where((sq) =>
   *   sq.select('id').from('post').where(w => w.equals('author', 'user:alice'))
   * );
   * // Returns: "(SELECT id FROM post WHERE author = $where_0)"
   * ```
   */
  static where(builder: (sq: SubqueryBuilder) => SubqueryBuilder): string {
    const subquery = builder(new SubqueryBuilder());
    return subquery.buildSubquery({ wrapped: true });
  }

  /**
   * Create a subquery for computed fields.
   *
   * @param builder - Function to build the subquery
   * @param alias - Alias for the result
   * @returns SQL string for the subquery
   *
   * @example
   * ```ts
   * const postCount = SubqueryBuilder.field(
   *   (sq) => sq.select('count()').from('post').where(w => w.raw('author = parent.id')),
   *   'post_count'
   * );
   * // In SELECT: (SELECT count() FROM post WHERE author = parent.id) as post_count
   * ```
   */
  static field(
    builder: (sq: SubqueryBuilder) => SubqueryBuilder,
    alias: string,
  ): string {
    const subquery = builder(new SubqueryBuilder());
    return subquery.buildSubquery({ wrapped: true, alias });
  }

  /**
   * Create an EXISTS subquery.
   *
   * @param builder - Function to build the subquery
   * @returns SQL string with EXISTS clause
   *
   * @example
   * ```ts
   * const hasPost = SubqueryBuilder.exists((sq) =>
   *   sq.select('*').from('post').where(w => w.raw('author = parent.id'))
   * );
   * // Returns: "EXISTS (SELECT * FROM post WHERE author = parent.id)"
   * ```
   */
  static exists(builder: (sq: SubqueryBuilder) => SubqueryBuilder): string {
    const subquery = builder(new SubqueryBuilder());
    return `EXISTS ${subquery.buildSubquery({ wrapped: true })}`;
  }

  /**
   * Create an IN subquery.
   *
   * @param field - Field to check
   * @param builder - Function to build the subquery
   * @returns SQL string with IN clause
   *
   * @example
   * ```ts
   * const inFollowing = SubqueryBuilder.in('id', (sq) =>
   *   sq.select('out').from('follows').where(w => w.equals('in', 'user:alice'))
   * );
   * // Returns: "id IN (SELECT out FROM follows WHERE in = $where_0)"
   * ```
   */
  static in(
    field: string,
    builder: (sq: SubqueryBuilder) => SubqueryBuilder,
  ): string {
    const subquery = builder(new SubqueryBuilder());
    return `${field} IN ${subquery.buildSubquery({ wrapped: true })}`;
  }

  /**
   * Create a NOT IN subquery.
   */
  static notIn(
    field: string,
    builder: (sq: SubqueryBuilder) => SubqueryBuilder,
  ): string {
    const subquery = builder(new SubqueryBuilder());
    return `${field} NOT IN ${subquery.buildSubquery({ wrapped: true })}`;
  }

  /**
   * Create array access subquery (for getting first result).
   *
   * @param builder - Function to build the subquery
   * @param index - Array index (default: 0)
   * @returns SQL string with array access
   *
   * @example
   * ```ts
   * const firstPost = SubqueryBuilder.arrayAccess(
   *   (sq) => sq.select('*').from('post').orderBy('created_at', 'DESC').limit(1),
   *   0
   * );
   * // Returns: "(SELECT * FROM post ORDER BY created_at DESC LIMIT 1)[0]"
   * ```
   */
  static arrayAccess(
    builder: (sq: SubqueryBuilder) => SubqueryBuilder,
    index: number = 0,
  ): string {
    const subquery = builder(new SubqueryBuilder());
    return `${subquery.buildSubquery({ wrapped: true })}[${index}]`;
  }
}

/**
 * Helper function to create a subquery builder.
 */
export function subquery(): SubqueryBuilder {
  return new SubqueryBuilder();
}
