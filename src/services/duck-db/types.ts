/**
 * @fileoverview Defines types and interfaces for the DuckDB service.
 * @module services/duck-db/types
 */

import * as duckdb from "@duckdb/node-api";

/**
 * Configuration options for initializing the DuckDB service.
 */
export interface DuckDBServiceConfig {
  /**
   * The path to the database file.
   * Use ':memory:' for an in-memory database.
   * If undefined, defaults to an in-memory database.
   */
  dbPath?: string;

  /**
   * Optional DuckDB launch configurations.
   * Refer to DuckDB documentation for available options.
   * Example: { allow_unsigned_extensions: 'true' }
   */
  launchConfig?: Record<string, string>;

  /**
   * List of extensions to install and load upon initialization.
   * Example: ['httpfs', 'json']
   */
  extensions?: string[];
}

/**
 * Represents a query to be executed.
 */
export interface DuckDBQuery {
  sql: string;
  params?: unknown[];
}

/**
 * Represents the result of a query execution.
 */
export interface DuckDBQueryResult<T = Record<string, unknown>> {
  rows: T[];
  columnNames: string[];
  columnTypes: duckdb.DuckDBTypeId[]; // Using DuckDBTypeId from the library
  rowCount: number;
}

/**
 * Interface for the DuckDB service.
 */
export interface IDuckDBService {
  /**
   * Initializes the DuckDB service with the given configuration.
   * Must be called before any other operations.
   * @param {DuckDBServiceConfig} config - The configuration for the DuckDB service.
   * @returns {Promise<void>}
   * @throws {McpError} If initialization fails.
   */
  initialize(config?: DuckDBServiceConfig): Promise<void>;

  /**
   * Executes a SQL query that does not return a large result set (e.g., CREATE, INSERT, UPDATE, DELETE).
   * @param {string} sql - The SQL query string.
   * @param {unknown[]} [params] - Optional parameters for the query.
   * @returns {Promise<void>}
   * @throws {McpError} If the query fails or the service is not initialized.
   */
  run(sql: string, params?: unknown[]): Promise<void>;

  /**
   * Executes a SQL query and returns all resulting rows.
   * Suitable for queries that return a manageable number of rows.
   * @template T - The expected type of the row objects.
   * @param {string} sql - The SQL query string.
   * @param {unknown[]} [params] - Optional parameters for the query.
   * @returns {Promise<DuckDBQueryResult<T>>} The query result.
   * @throws {McpError} If the query fails or the service is not initialized.
   */
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<DuckDBQueryResult<T>>;

  /**
   * Executes a SQL query and provides a streaming result reader.
   * Suitable for queries that return very large result sets.
   * The caller is responsible for closing the stream.
   * @param {string} sql - The SQL query string.
   * @param {unknown[]} [params] - Optional parameters for the query.
   * @returns {Promise<duckdb.DuckDBStreamingResult>} A streaming result object.
   * @throws {McpError} If the query fails or the service is not initialized.
   */
  stream(
    sql: string,
    params?: unknown[],
  ): Promise<duckdb.DuckDBResult>;

  /**
   * Creates a prepared statement.
   * @param {string} sql - The SQL query string for the prepared statement.
   * @returns {Promise<duckdb.DuckDBPreparedStatement>} The prepared statement object.
   * @throws {McpError} If preparing the statement fails or the service is not initialized.
   */
  prepare(sql: string): Promise<duckdb.DuckDBPreparedStatement>;

  /**
   * Begins a new transaction.
   * @returns {Promise<void>}
   * @throws {McpError} If starting the transaction fails or the service is not initialized.
   */
  beginTransaction(): Promise<void>;

  /**
   * Commits the current transaction.
   * @returns {Promise<void>}
   * @throws {McpError} If committing the transaction fails or the service is not initialized.
   */
  commitTransaction(): Promise<void>;

  /**
   * Rolls back the current transaction.
   * @returns {Promise<void>}
   * @throws {McpError} If rolling back the transaction fails or the service is not initialized.
   */
  rollbackTransaction(): Promise<void>;

  /**
   * Installs and loads a DuckDB extension.
   * @param {string} extensionName - The name of the extension to install and load.
   * @returns {Promise<void>}
   * @throws {McpError} If installing or loading the extension fails or the service is not initialized.
   */
  loadExtension(extensionName: string): Promise<void>;

  /**
   * Closes the DuckDB connection and instance.
   * @returns {Promise<void>}
   * @throws {McpError} If closing fails.
   */
  close(): Promise<void>;

  /**
   * Gets the underlying DuckDB connection object.
   * Use with caution, primarily for advanced scenarios not covered by the service interface.
   * @returns {duckdb.DuckDBConnection | null} The connection object, or null if not initialized.
   */
  getRawConnection(): duckdb.DuckDBConnection | null;

  /**
   * Gets the underlying DuckDB instance object.
   * Use with caution, primarily for advanced scenarios not covered by the service interface.
   * @returns {duckdb.DuckDBInstance | null} The instance object, or null if not initialized.
   */
  getRawInstance(): duckdb.DuckDBInstance | null;
}
