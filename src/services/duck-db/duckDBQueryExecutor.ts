/**
 * @fileoverview Executes SQL queries and manages transactions for DuckDB.
 * @module services/duck-db/duckDBQueryExecutor
 */

import * as duckdb from "@duckdb/node-api";
import { JsonRpcErrorCode } from "@/types-global/errors.js";
import { ErrorHandler, logger, requestContextService } from "@/utils/index.js";
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
        logger.debug({ ...context, params }, `Executing SQL (run): ${sql}`);
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
        errorCode: JsonRpcErrorCode.DatabaseError,
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
        logger.debug({ ...context, params }, `Executing SQL (query): ${sql}`);
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
        errorCode: JsonRpcErrorCode.DatabaseError,
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
        logger.debug({ ...context, params }, `Executing SQL (stream): ${sql}`);
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
        errorCode: JsonRpcErrorCode.DatabaseError,
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
        logger.debug(context, `Preparing SQL: ${sql}`);
        return this.dbConnection.prepare(sql);
      },
      {
        operation: "DuckDBQueryExecutor.prepare",
        context,
        input: { sql },
        errorCode: JsonRpcErrorCode.DatabaseError,
      },
    );
  }

  public async beginTransaction(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBQueryExecutor.beginTransaction",
    });
    await this.run("BEGIN TRANSACTION");
    logger.info(context, "Transaction started.");
  }

  public async commitTransaction(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBQueryExecutor.commitTransaction",
    });
    await this.run("COMMIT");
    logger.info(context, "Transaction committed.");
  }

  public async rollbackTransaction(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBQueryExecutor.rollbackTransaction",
    });
    await this.run("ROLLBACK");
    logger.info(context, "Transaction rolled back.");
  }
}
