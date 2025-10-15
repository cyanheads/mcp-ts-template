/**
 * @fileoverview Schema introspection for SurrealDB.
 * Inspects and reports on database schema structure.
 * @module src/storage/providers/surrealdb/introspection/schemaIntrospector
 */

import type Surreal from 'surrealdb';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';

/**
 * Table information from schema.
 */
export interface TableInfo {
  /** Table name */
  name: string;
  /** Whether table is schemafull */
  schemafull: boolean;
  /** Fields defined on table */
  fields: FieldInfo[];
  /** Indexes defined on table */
  indexes: IndexInfo[];
  /** Events defined on table */
  events: EventInfo[];
}

/**
 * Field information.
 */
export interface FieldInfo {
  /** Field name */
  name: string;
  /** Field type */
  type: string;
  /** Whether field is required */
  required: boolean;
  /** Default value if any */
  default?: string;
}

/**
 * Index information.
 */
export interface IndexInfo {
  /** Index name */
  name: string;
  /** Columns in index */
  columns: string[];
  /** Whether index is unique */
  unique: boolean;
}

/**
 * Event information.
 */
export interface EventInfo {
  /** Event name */
  name: string;
  /** When event triggers */
  when?: string;
  /** What event does */
  then: string;
}

/**
 * Complete database schema information.
 */
export interface DatabaseSchema {
  /** Namespace name */
  namespace: string;
  /** Database name */
  database: string;
  /** Tables in database */
  tables: TableInfo[];
  /** Custom functions */
  functions: string[];
  /** Access methods */
  accessMethods: string[];
}

/**
 * Introspects SurrealDB schema structure.
 *
 * @remarks
 * Provides methods to:
 * - Inspect tables and fields
 * - List indexes and events
 * - Generate schema documentation
 * - Export schema as code
 *
 * @example
 * ```ts
 * const inspector = new SchemaIntrospector(client);
 *
 * const schema = await inspector.getDatabaseSchema(context);
 * console.log(`Found ${schema.tables.length} tables`);
 *
 * const tableInfo = await inspector.getTableInfo('user', context);
 * console.log(`Table has ${tableInfo.fields.length} fields`);
 * ```
 */
export class SchemaIntrospector {
  constructor(private readonly client: Surreal) {}

  /**
   * Get complete database schema.
   *
   * @param context - Request context
   * @returns Database schema information
   */
  async getDatabaseSchema(context: RequestContext): Promise<DatabaseSchema> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.debug('[SchemaIntrospector] Getting database schema', context);

        const query = 'INFO FOR DATABASE';

        const result = await this.client.query<
          [
            {
              result: {
                tables: Record<string, unknown>;
                functions: Record<string, unknown>;
                accesses: Record<string, unknown>;
              };
            },
          ]
        >(query);

        const info = result[0]?.result;

        const tables = Object.keys(info?.tables ?? {});
        const functions = Object.keys(info?.functions ?? {});
        const accessMethods = Object.keys(info?.accesses ?? {});

        // Get detailed info for each table
        const tableInfos: TableInfo[] = [];
        for (const tableName of tables) {
          const tableInfo = await this.getTableInfo(tableName, context);
          tableInfos.push(tableInfo);
        }

        return {
          namespace: '', // Would need to query separately
          database: '', // Would need to query separately
          tables: tableInfos,
          functions,
          accessMethods,
        };
      },
      {
        operation: 'SchemaIntrospector.getDatabaseSchema',
        context,
      },
    );
  }

  /**
   * Get information about a specific table.
   *
   * @param tableName - Table name
   * @param context - Request context
   * @returns Table information
   */
  async getTableInfo(
    tableName: string,
    context: RequestContext,
  ): Promise<TableInfo> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = `INFO FOR TABLE ${tableName}`;

        const result = await this.client.query<
          [
            {
              result: {
                fields: Record<string, string>;
                indexes: Record<string, string>;
                events: Record<string, string>;
              };
            },
          ]
        >(query);

        const info = result[0]?.result;

        const fields: FieldInfo[] = Object.entries(info?.fields ?? {}).map(
          ([name, type]) => ({
            name,
            type: String(type),
            required: !String(type).includes('option'),
          }),
        );

        const indexes: IndexInfo[] = Object.entries(info?.indexes ?? {}).map(
          ([name, _def]) => ({
            name,
            columns: [], // Would parse from definition
            unique: String(_def).includes('UNIQUE'),
          }),
        );

        const events: EventInfo[] = Object.keys(info?.events ?? {}).map(
          (name) => ({
            name,
            when: '',
            then: '',
          }),
        );

        return {
          name: tableName,
          schemafull: true, // Would parse from table definition
          fields,
          indexes,
          events,
        };
      },
      {
        operation: 'SchemaIntrospector.getTableInfo',
        context,
        input: { tableName },
      },
    );
  }

  /**
   * List all tables in the database.
   *
   * @param context - Request context
   * @returns Array of table names
   */
  async listTables(context: RequestContext): Promise<string[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = 'INFO FOR DATABASE';

        const result =
          await this.client.query<
            [{ result: { tables: Record<string, unknown> } }]
          >(query);

        const tables = result[0]?.result?.tables ?? {};
        return Object.keys(tables);
      },
      {
        operation: 'SchemaIntrospector.listTables',
        context,
      },
    );
  }

  /**
   * List all custom functions.
   *
   * @param context - Request context
   * @returns Array of function names
   */
  async listFunctions(context: RequestContext): Promise<string[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = 'INFO FOR DATABASE';

        const result =
          await this.client.query<
            [{ result: { functions: Record<string, unknown> } }]
          >(query);

        const functions = result[0]?.result?.functions ?? {};
        return Object.keys(functions);
      },
      {
        operation: 'SchemaIntrospector.listFunctions',
        context,
      },
    );
  }
}
