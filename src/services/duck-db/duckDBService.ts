/**
 * @fileoverview Implements the DuckDB service for interacting with a DuckDB database.
 * @module services/duck-db/duckDBService
 */

import * as duckdb from "@duckdb/node-api";
import { JsonRpcErrorCode, McpError } from "@/types-global/errors.js";
import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "@/utils/index.js";
import { DuckDBConnectionManager } from "./duckDBConnectionManager.js";
import { DuckDBQueryExecutor } from "./duckDBQueryExecutor.js";
import {
  DuckDBQueryResult,
  DuckDBServiceConfig,
  IDuckDBService,
} from "./types.js";

export class DuckDBService implements IDuckDBService {
  private connectionManager: DuckDBConnectionManager;
  private queryExecutor: DuckDBQueryExecutor | null = null;
  private isInitialized = false;

  constructor() {
    this.connectionManager = new DuckDBConnectionManager();
  }

  async initialize(config?: DuckDBServiceConfig): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBService.initialize",
      initialData: config,
    });

    if (this.isInitialized) {
      logger.warning(
        context,
        "DuckDBService already initialized. Close first to re-initialize.",
      );
      return;
    }

    return ErrorHandler.tryCatch(
      async () => {
        await this.connectionManager.initialize(config);
        const connection = this.connectionManager.getConnection();
        this.queryExecutor = new DuckDBQueryExecutor(connection);
        this.isInitialized = true;
        logger.info(context, "DuckDBService initialized successfully.");
      },
      {
        operation: "DuckDBService.initialize",
        context,
        input: config,
        errorCode: JsonRpcErrorCode.InitializationFailed,
        critical: true,
      },
    );
  }

  private ensureInitialized(context: RequestContext): void {
    this.connectionManager.ensureInitialized(context); // Delegate to manager
    if (!this.queryExecutor) {
      // This check is mostly for type safety, as connectionManager.ensureInitialized should cover it
      throw new McpError(
        JsonRpcErrorCode.ServiceUnavailable,
        "DuckDBQueryExecutor not available. DuckDBService may not be fully initialized.",
        context,
      );
    }
  }

  private validateParams(
    params: unknown,
    context: RequestContext,
  ): duckdb.DuckDBValue[] | undefined {
    if (params === undefined) {
      return undefined;
    }
    if (Array.isArray(params)) {
      return params as duckdb.DuckDBValue[];
    }
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      "DuckDB service only supports array-style parameters, not named objects.",
      context,
    );
  }

  async run(sql: string, params?: unknown[]): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBService.run",
      initialData: { sql, params },
    });
    this.ensureInitialized(context);
    const validatedParams = this.validateParams(params, context);
    return this.queryExecutor!.run(sql, validatedParams);
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<DuckDBQueryResult<T>> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBService.query",
      initialData: { sql, params },
    });
    this.ensureInitialized(context);
    const validatedParams = this.validateParams(params, context);
    return this.queryExecutor!.query<T>(sql, validatedParams);
  }

  async stream(sql: string, params?: unknown[]): Promise<duckdb.DuckDBResult> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBService.stream",
      initialData: { sql, params },
    });
    this.ensureInitialized(context);
    const validatedParams = this.validateParams(params, context);
    return this.queryExecutor!.stream(sql, validatedParams);
  }

  async prepare(sql: string): Promise<duckdb.DuckDBPreparedStatement> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBService.prepare",
      initialData: { sql },
    });
    this.ensureInitialized(context);
    return this.queryExecutor!.prepare(sql);
  }

  async beginTransaction(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBService.beginTransaction",
    });
    this.ensureInitialized(context);
    return this.queryExecutor!.beginTransaction();
  }

  async commitTransaction(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBService.commitTransaction",
    });
    this.ensureInitialized(context);
    return this.queryExecutor!.commitTransaction();
  }

  async rollbackTransaction(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBService.rollbackTransaction",
    });
    this.ensureInitialized(context);
    return this.queryExecutor!.rollbackTransaction();
  }

  async loadExtension(extensionName: string): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBService.loadExtension",
      initialData: { extensionName },
    });
    // ensureInitialized is implicitly called by connectionManager.loadExtension
    // if we call ensureInitialized here, it uses the service's context,
    // but loadExtension in manager will create its own.
    // It's better to let the manager handle its own initialization checks.
    return this.connectionManager.loadExtension(extensionName, context);
  }

  async close(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBService.close",
    });

    // No need to check this.isInitialized here, connectionManager.close() handles it.
    return ErrorHandler.tryCatch(
      async () => {
        await this.connectionManager.close();
        this.queryExecutor = null;
        this.isInitialized = false;
        logger.info(context, "DuckDBService closed successfully.");
      },
      {
        operation: "DuckDBService.close",
        context,
        errorCode: JsonRpcErrorCode.InternalError,
      },
    );
  }

  getRawConnection(): duckdb.DuckDBConnection | null {
    if (this.connectionManager.isServiceInitialized) {
      return this.connectionManager.getConnection();
    }
    return null;
  }

  getRawInstance(): duckdb.DuckDBInstance | null {
    if (this.connectionManager.isServiceInitialized) {
      return this.connectionManager.getInstance();
    }
    return null;
  }
}
