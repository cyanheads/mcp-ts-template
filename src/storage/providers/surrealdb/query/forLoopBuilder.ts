/**
 * @fileoverview FOR loop builder for iterating over arrays and collections.
 * Supports SurrealDB's FOR statement for recursive and iterative operations.
 * @module src/storage/providers/surrealdb/query/forLoopBuilder
 */

/**
 * FOR loop configuration.
 */
export interface ForLoopConfig {
  /** Variable name for iteration */
  variable: string;
  /** Source to iterate over (array, query, range) */
  source: string;
  /** Body statements to execute */
  body: string[];
}

/**
 * Builder for FOR loop statements.
 *
 * @remarks
 * Enables iteration over:
 * - Arrays and array fields
 * - Query results
 * - Number ranges
 * - Nested loops
 *
 * @example
 * ```ts
 * // Iterate over array field
 * const loop = ForLoopBuilder.create('item')
 *   .in('$items')
 *   .do('CREATE processed_item SET value = $item')
 *   .build();
 *
 * // Result: "FOR $item IN $items { CREATE processed_item SET value = $item }"
 * ```
 */
export class ForLoopBuilder {
  private variable: string = '';
  private source: string = '';
  private body: string[] = [];

  private constructor() {}

  /**
   * Create a new FOR loop builder.
   *
   * @param variable - Variable name for iteration (without $)
   */
  static create(variable: string): ForLoopBuilder {
    const builder = new ForLoopBuilder();
    builder.variable = variable;
    return builder;
  }

  /**
   * Set the source to iterate over.
   *
   * @param source - Array, query, or range expression
   */
  in(source: string): this {
    this.source = source;
    return this;
  }

  /**
   * Add a statement to the loop body.
   *
   * @param statement - SurrealQL statement
   */
  do(statement: string): this {
    this.body.push(statement);
    return this;
  }

  /**
   * Add multiple statements to the loop body.
   *
   * @param statements - Array of SurrealQL statements
   */
  doAll(statements: string[]): this {
    this.body.push(...statements);
    return this;
  }

  /**
   * Build the FOR loop statement.
   */
  build(): string {
    if (!this.variable) {
      throw new Error('Variable name is required');
    }

    if (!this.source) {
      throw new Error('Source is required');
    }

    if (this.body.length === 0) {
      throw new Error('At least one statement in body is required');
    }

    const bodyStr =
      this.body.length === 1
        ? this.body[0]
        : this.body.map((s) => `  ${s}`).join(';\n');

    return `FOR $${this.variable} IN ${this.source} {\n${bodyStr}\n}`;
  }

  /**
   * Create a FOR loop over array range.
   *
   * @param variable - Variable name
   * @param start - Start index
   * @param end - End index
   * @param body - Statement(s) to execute
   * @returns FOR loop string
   *
   * @example
   * ```ts
   * const loop = ForLoopBuilder.range('i', 0, 10, 'CREATE item SET index = $i');
   * // Result: "FOR $i IN 0..10 { CREATE item SET index = $i }"
   * ```
   */
  static range(
    variable: string,
    start: number,
    end: number,
    body: string | string[],
  ): string {
    return ForLoopBuilder.create(variable)
      .in(`${start}..${end}`)
      .doAll(Array.isArray(body) ? body : [body])
      .build();
  }

  /**
   * Create a FOR loop over array field.
   *
   * @param variable - Variable name
   * @param arrayField - Field containing array
   * @param body - Statement(s) to execute
   * @returns FOR loop string
   */
  static array(
    variable: string,
    arrayField: string,
    body: string | string[],
  ): string {
    return ForLoopBuilder.create(variable)
      .in(arrayField)
      .doAll(Array.isArray(body) ? body : [body])
      .build();
  }

  /**
   * Create a FOR loop over query results.
   *
   * @param variable - Variable name
   * @param query - SELECT query to iterate over
   * @param body - Statement(s) to execute
   * @returns FOR loop string
   *
   * @example
   * ```ts
   * const loop = ForLoopBuilder.query(
   *   'user',
   *   '(SELECT * FROM user WHERE active = true)',
   *   'UPDATE $user SET last_checked = time::now()'
   * );
   * ```
   */
  static query(
    variable: string,
    query: string,
    body: string | string[],
  ): string {
    return ForLoopBuilder.create(variable)
      .in(query)
      .doAll(Array.isArray(body) ? body : [body])
      .build();
  }

  /**
   * Create nested FOR loops.
   *
   * @param configs - Array of loop configurations
   * @returns Nested FOR loop string
   *
   * @example
   * ```ts
   * const nested = ForLoopBuilder.nested([
   *   { variable: 'category', source: '$categories', body: [] },
   *   { variable: 'item', source: '$category.items', body: ['CREATE processed SET ...'] }
   * ]);
   * ```
   */
  static nested(configs: ForLoopConfig[]): string {
    if (configs.length === 0) {
      throw new Error('At least one loop configuration required');
    }

    let result = '';
    let indent = 0;

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      if (!config) continue;

      const isLast = i === configs.length - 1;
      const spacing = '  '.repeat(indent);

      result += `${spacing}FOR $${config.variable} IN ${config.source} {\n`;

      if (isLast && config.body && config.body.length > 0) {
        config.body.forEach((stmt) => {
          result += `${spacing}  ${stmt};\n`;
        });
      }

      indent++;
    }

    // Close all loops
    for (let i = configs.length - 1; i >= 0; i--) {
      indent--;
      result += '  '.repeat(indent) + '}\n';
    }

    return result.trim();
  }
}

/**
 * Helper function to create a subquery builder.
 */
export function forLoop(variable: string): ForLoopBuilder {
  return ForLoopBuilder.create(variable);
}
