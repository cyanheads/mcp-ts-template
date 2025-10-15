/**
 * @fileoverview Custom function manager for SurrealDB.
 * Manages DEFINE FUNCTION for reusable database logic.
 * @module src/storage/providers/surrealdb/functions/customFunctions
 */

import type Surreal from 'surrealdb';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';

/**
 * Function parameter definition.
 */
export interface FunctionParameter {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: string;
  /** Default value (optional) */
  default?: unknown;
}

/**
 * Custom function configuration.
 */
export interface CustomFunctionConfig {
  /** Function name (e.g., 'calculate_total') */
  name: string;
  /** Function parameters */
  parameters: FunctionParameter[];
  /** Return type */
  returnType?: string;
  /** Function body (SurrealQL) */
  body: string;
  /** Optional comment/description */
  comment?: string;
  /** Whether function allows permissions */
  permissions?: boolean;
}

/**
 * Result of function definition.
 */
export interface DefineFunctionResult {
  /** Function name */
  name: string;
  /** Whether definition succeeded */
  success: boolean;
}

/**
 * Manages custom functions in SurrealDB.
 *
 * @remarks
 * Custom functions allow complex, reusable logic to be executed
 * within queries. Functions can:
 * - Accept typed parameters
 * - Return typed results
 * - Execute multiple statements
 * - Call other functions
 *
 * @example
 * ```ts
 * const funcMgr = new CustomFunctions(client);
 *
 * await funcMgr.define({
 *   name: 'calculate_discount',
 *   parameters: [
 *     { name: 'price', type: 'decimal' },
 *     { name: 'percent', type: 'int' }
 *   ],
 *   returnType: 'decimal',
 *   body: 'RETURN $price * (1 - $percent / 100);'
 * }, context);
 *
 * // Use in query:
 * // SELECT fn::calculate_discount(price, 20) as discounted FROM product;
 * ```
 */
export class CustomFunctions {
  constructor(private readonly client: Surreal) {}

  /**
   * Define a custom function.
   *
   * @param config - Function configuration
   * @param context - Request context
   * @returns Definition result
   */
  async define(
    config: CustomFunctionConfig,
    context: RequestContext,
  ): Promise<DefineFunctionResult> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.info(
          `[CustomFunctions] Defining function: fn::${config.name}`,
          context,
        );

        const query = this.buildDefineFunctionQuery(config);

        await this.client.query(query);

        logger.info(
          `[CustomFunctions] Function defined: fn::${config.name}`,
          context,
        );

        return {
          name: config.name,
          success: true,
        };
      },
      {
        operation: 'CustomFunctions.define',
        context,
        input: { name: config.name },
      },
    );
  }

  /**
   * Remove a custom function.
   *
   * @param name - Function name
   * @param context - Request context
   * @returns True if removed
   */
  async remove(name: string, context: RequestContext): Promise<boolean> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.info(
          `[CustomFunctions] Removing function: fn::${name}`,
          context,
        );

        const query = `REMOVE FUNCTION fn::${name}`;

        await this.client.query(query);

        logger.info(`[CustomFunctions] Function removed: fn::${name}`, context);

        return true;
      },
      {
        operation: 'CustomFunctions.remove',
        context,
        input: { name },
      },
    );
  }

  /**
   * Check if a function exists.
   *
   * @param name - Function name
   * @param context - Request context
   * @returns True if function exists
   */
  async exists(name: string, context: RequestContext): Promise<boolean> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = 'INFO FOR DATABASE';

        const result =
          await this.client.query<
            [{ result: { functions: Record<string, unknown> } }]
          >(query);

        const functions = result[0]?.result?.functions || {};
        return `fn::${name}` in functions;
      },
      {
        operation: 'CustomFunctions.exists',
        context,
        input: { name },
      },
    );
  }

  /**
   * Build DEFINE FUNCTION query.
   */
  private buildDefineFunctionQuery(config: CustomFunctionConfig): string {
    const parts = [`DEFINE FUNCTION fn::${config.name}(`];

    // Build parameters
    const params = config.parameters
      .map((p) => {
        let param = `$${p.name}: ${p.type}`;
        if (p.default !== undefined) {
          param += ` = ${JSON.stringify(p.default)}`;
        }
        return param;
      })
      .join(', ');

    parts.push(params);
    parts.push(')');

    // Add return type if specified
    if (config.returnType) {
      parts.push(`-> ${config.returnType}`);
    }

    parts.push('{');

    // Add body
    parts.push(`  ${config.body}`);

    parts.push('}');

    // Add comment if specified
    if (config.comment) {
      parts.push(`COMMENT "${config.comment}"`);
    }

    // Add permissions if specified
    if (config.permissions !== false) {
      parts.push('PERMISSIONS FULL');
    }

    return parts.join(' ');
  }
}
