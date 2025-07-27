/**
 * @fileoverview Executes SQL queries and manages transactions for DuckDB.
 * @module services/duck-db/duckDBQueryExecutor
 */

import * as duckdb from "@duckdb/node-api";
import { BaseErrorCode } from "../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  requestContextService,
} from "../../utils/index.js";
import { DuckDBQueryResult } from "./types.js";

export class DuckDBQueryExecutor {
  private dbConnection: duckdb.DuckDBConnection;

  constructor(connection: duckdb.DuckDBConnection) {
    this.dbConnection = connection;
  }

  public async run(sql: string, params?: duckdb.DuckDBValue[]): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBQueryExecutor.run",
      initialData: { sql, params },
    });

    return ErrorHandler.tryCatch(
      async () => {
        logger.debug(`Executing SQL (run): ${sql}`, { ...context, params });
        if (params === undefined) {
          await this.dbConnection.run(sql);
        } else {
          await this.dbConnection.run(sql, params);
        }
      },
      {
        operation: "DuckDBQueryExecutor.run",
        context,
        input: { sql, params },
        errorCode: BaseErrorCode.DATABASE_ERROR,
      },
    );
  }

  public async query<T = Record<string, unknown>>(
    sql: string,
    params?: duckdb.DuckDBValue[],
  ): Promise<DuckDBQueryResult<T>> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBQueryExecutor.query",
      initialData: { sql, params },
    });

    return ErrorHandler.tryCatch(
      async () => {
        logger.debug(`Executing SQL (query): ${sql}`, { ...context, params });
        const resultObject: duckdb.DuckDBResult = await this.stream(
          sql,
          params,
        );

        const rows = (await resultObject.getRows()) as T[];
        const columnNames = resultObject.columnNames();
        const columnTypes = resultObject
          .columnTypes()
          .map((ct: duckdb.DuckDBType) => ct.typeId);

        return {
          rows: rows,
          columnNames: columnNames,
          columnTypes: columnTypes,
          rowCount: rows.length,
        };
      },
      {
        operation: "DuckDBQueryExecutor.query",
        context,
        input: { sql, params },
        errorCode: BaseErrorCode.DATABASE_ERROR,
      },
    );
  }

  public async stream(
    sql: string,
    params?: duckdb.DuckDBValue[],
  ): Promise<duckdb.DuckDBResult> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBQueryExecutor.stream",
      initialData: { sql, params },
    });

    return ErrorHandler.tryCatch(
      async () => {
        logger.debug(`Executing SQL (stream): ${sql}`, { ...context, params });
        if (params === undefined) {
          return this.dbConnection.stream(sql);
        } else {
          return this.dbConnection.stream(sql, params);
        }
      },
      {
        operation: "DuckDBQueryExecutor.stream",
        context,
        input: { sql, params },
        errorCode: BaseErrorCode.DATABASE_ERROR,
      },
    );
  }

  public async prepare(sql: string): Promise<duckdb.DuckDBPreparedStatement> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBQueryExecutor.prepare",
      initialData: { sql },
    });

    return ErrorHandler.tryCatch(
      async () => {
        logger.debug(`Preparing SQL: ${sql}`, context);
        return this.dbConnection.prepare(sql);
      },
      {
        operation: "DuckDBQueryExecutor.prepare",
        context,
        input: { sql },
        errorCode: BaseErrorCode.DATABASE_ERROR,
      },
    );
  }

  public async beginTransaction(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBQueryExecutor.beginTransaction",
    });
    await this.run("BEGIN TRANSACTION");
    logger.info("Transaction started.", context);
  }

  public async commitTransaction(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBQueryExecutor.commitTransaction",
    });
    await this.run("COMMIT");
    logger.info("Transaction committed.", context);
  }

  public async rollbackTransaction(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBQueryExecutor.rollbackTransaction",
    });
    await this.run("ROLLBACK");
    logger.info("Transaction rolled back.", context);
  }
}
