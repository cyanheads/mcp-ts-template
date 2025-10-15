/**
 * @fileoverview Query builder utilities for constructing SurrealQL queries.
 * Provides type-safe query construction helpers for common patterns.
 * @module src/storage/providers/surrealdb/core/queryBuilder
 */

/**
 * Parameter object for query building.
 */
export interface QueryParams {
  [key: string]: unknown;
}

/**
 * Built query with parameterized SQL and parameter values.
 */
export interface BuiltQuery {
  query: string;
  params: QueryParams;
}

/**
 * WHERE clause builder for filtering queries.
 */
export class WhereBuilder {
  private conditions: string[] = [];
  private params: QueryParams = {};
  private paramCounter: number = 0;

  /**
   * Add an equality condition.
   */
  equals(field: string, value: unknown): this {
    const paramName = `where_${this.paramCounter++}`;
    this.conditions.push(`${field} = $${paramName}`);
    this.params[paramName] = value;
    return this;
  }

  /**
   * Add a greater-than condition.
   */
  greaterThan(field: string, value: unknown): this {
    const paramName = `where_${this.paramCounter++}`;
    this.conditions.push(`${field} > $${paramName}`);
    this.params[paramName] = value;
    return this;
  }

  /**
   * Add an IN clause condition.
   */
  in(field: string, values: unknown[]): this {
    const paramName = `where_${this.paramCounter++}`;
    this.conditions.push(`${field} INSIDE $${paramName}`);
    this.params[paramName] = values;
    return this;
  }

  /**
   * Add a LIKE condition with string matching.
   */
  startsWith(field: string, prefix: string): this {
    const paramName = `where_${this.paramCounter++}`;
    this.conditions.push(`string::starts_with(${field}, $${paramName})`);
    this.params[paramName] = prefix;
    return this;
  }

  /**
   * Add a null check condition.
   */
  isNull(field: string): this {
    this.conditions.push(`${field} IS NONE`);
    return this;
  }

  /**
   * Add a not-null check condition.
   */
  isNotNull(field: string): this {
    this.conditions.push(`${field} IS NOT NONE`);
    return this;
  }

  /**
   * Add a raw condition (use with caution).
   */
  raw(condition: string, params?: QueryParams): this {
    this.conditions.push(condition);
    if (params) {
      Object.assign(this.params, params);
    }
    return this;
  }

  /**
   * Build the WHERE clause.
   */
  build(): { clause: string; params: QueryParams } {
    if (this.conditions.length === 0) {
      return { clause: '', params: {} };
    }

    return {
      clause: `WHERE ${this.conditions.join(' AND ')}`,
      params: this.params,
    };
  }
}

/**
 * Query builder for SELECT statements.
 */
export class SelectQueryBuilder {
  private table: string = '';
  private fields: string[] = ['*'];
  private whereBuilder = new WhereBuilder();
  private orderByField?: string;
  private orderDirection: 'ASC' | 'DESC' = 'ASC';
  private limitValue?: number;
  private params: QueryParams = {};

  /**
   * Set the table to select from.
   */
  from(table: string): this {
    this.table = table;
    return this;
  }

  /**
   * Set the fields to select.
   */
  select(...fields: string[]): this {
    this.fields = fields;
    return this;
  }

  /**
   * Add WHERE conditions.
   */
  where(builder: (where: WhereBuilder) => void): this {
    builder(this.whereBuilder);
    return this;
  }

  /**
   * Set ORDER BY clause.
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByField = field;
    this.orderDirection = direction;
    return this;
  }

  /**
   * Set LIMIT clause.
   */
  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  /**
   * Add custom parameters.
   */
  withParams(params: QueryParams): this {
    Object.assign(this.params, params);
    return this;
  }

  /**
   * Build the final query.
   */
  build(): BuiltQuery {
    if (!this.table) {
      throw new Error('Table name is required');
    }

    const parts: string[] = [
      `SELECT ${this.fields.join(', ')}`,
      `FROM type::table($table)`,
    ];

    const { clause: whereClause, params: whereParams } =
      this.whereBuilder.build();
    if (whereClause) {
      parts.push(whereClause);
    }

    if (this.orderByField) {
      parts.push(`ORDER BY ${this.orderByField} ${this.orderDirection}`);
    }

    if (this.limitValue !== undefined) {
      parts.push(`LIMIT ${this.limitValue}`);
    }

    const allParams = {
      table: this.table,
      ...whereParams,
      ...this.params,
    };

    return {
      query: parts.join(' '),
      params: allParams,
    };
  }
}

/**
 * Create a new SELECT query builder.
 */
export function select(...fields: string[]): SelectQueryBuilder {
  return new SelectQueryBuilder().select(...fields);
}

/**
 * Create a WHERE builder.
 */
export function where(builder: (where: WhereBuilder) => void): WhereBuilder {
  const whereBuilder = new WhereBuilder();
  builder(whereBuilder);
  return whereBuilder;
}
