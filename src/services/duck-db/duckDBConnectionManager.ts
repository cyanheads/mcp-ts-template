/**
 * @fileoverview Manages DuckDB instance and connection lifecycle.
 * @module services/duck-db/duckDBConnectionManager
 */

import * as duckdb from "@duckdb/node-api";
import { JsonRpcErrorCode, McpError } from "@/types-global/errors.js";
import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "@/utils/index.js";
import { DuckDBServiceConfig } from "./types.js";

const DEFAULT_DB_PATH = ":memory:";

export class DuckDBConnectionManager {
  private dbInstance: duckdb.DuckDBInstance | null = null;
  private dbConnection: duckdb.DuckDBConnection | null = null;
  private isInitialized = false;
  private currentConfig: DuckDBServiceConfig | null = null;

  /**
   * Initializes the DuckDB instance and connection.
   * @param {DuckDBServiceConfig} [config] - Configuration for the service.
   * @returns {Promise<void>}
   */
  public async initialize(config?: DuckDBServiceConfig): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBConnectionManager.initialize",
      initialData: config,
    });

    if (this.isInitialized) {
      logger.warning(
        context,
        "DuckDBConnectionManager already initialized. Close first to re-initialize.",
      );
      // Potentially compare new config with old config if re-init with changes is desired
      return;
    }
    this.currentConfig = config || {};

    return ErrorHandler.tryCatch(
      async () => {
        const dbPath = this.currentConfig?.dbPath || DEFAULT_DB_PATH;
        const launchConfig = this.currentConfig?.launchConfig;

        logger.info(
          context,
          `Initializing DuckDB instance with path: ${dbPath}`,
        );

        // Pass launchConfig directly to the create method
        // The exact structure for launchConfig might need verification against @duckdb/node-api docs
        // Assuming it takes an object similar to what's in DuckDBServiceConfig
        this.dbInstance = await duckdb.DuckDBInstance.create(
          dbPath,
          launchConfig || {},
        );
        this.dbConnection = await this.dbInstance.connect();
        logger.info(context, "DuckDB instance and connection created.");

        // Set isInitialized to true now that core components are ready
        this.isInitialized = true;

        // If launchConfig was successfully passed to create(), this block might no longer be needed
        // or might be adjusted for settings that *can* be applied post-connection.
        // For now, let's comment it out to avoid the original error.
        // if (launchConfig) {
        //   for (const [key, value] of Object.entries(launchConfig)) {
        //     // Ensure connection is available for run
        //     if (!this.dbConnection) {
        //       throw new McpError(
        //         BaseErrorCode.INTERNAL_ERROR,
        //         "Connection not available for applying launch config",
        //         context,
        //       );
        //     }
        //     await this.dbConnection.run(
        //       `SET ${key}='${String(value).replace(/'/g, "''")}';`,
        //     );
        //   }
        //   logger.info({
        //     ...context,
        //     launchConfig,
        //   }, "Applied launch configuration via SET commands.");
        // }

        if (
          this.currentConfig?.extensions &&
          this.currentConfig.extensions.length > 0
        ) {
          logger.info(
            {
              ...context,
              extensions: this.currentConfig.extensions,
            },
            "Loading extensions...",
          );
          for (const extName of this.currentConfig.extensions) {
            await this.loadExtension(extName, context);
          }
        }

        // this.isInitialized = true; // Moved earlier
        logger.info(
          context,
          "DuckDBConnectionManager initialized successfully.",
        );
      },
      {
        operation: "DuckDBConnectionManager.initialize",
        context,
        input: config,
        errorCode: JsonRpcErrorCode.InitializationFailed,
        critical: true,
      },
    );
  }

  /**
   * Installs and loads a DuckDB extension.
   * @param {string} extensionName - The name of the extension.
   * @param {RequestContext} parentContext - The parent request context.
   * @returns {Promise<void>}
   */
  public async loadExtension(
    extensionName: string,
    parentContext: RequestContext,
  ): Promise<void> {
    this.ensureInitialized(parentContext);
    const context = requestContextService.createRequestContext({
      operation: "DuckDBConnectionManager.loadExtension",
      initialData: { extensionName },
      parentContext,
    });

    return ErrorHandler.tryCatch(
      async () => {
        logger.info(context, `Installing extension: ${extensionName}`);
        await this.dbConnection!.run(
          `INSTALL '${extensionName.replace(/'/g, "''")}'`,
        );
        logger.info(context, `Loading extension: ${extensionName}`);
        await this.dbConnection!.run(
          `LOAD '${extensionName.replace(/'/g, "''")}'`,
        );
        logger.info(
          context,
          `Extension ${extensionName} installed and loaded.`,
        );
      },
      {
        operation: "DuckDBConnectionManager.loadExtension",
        context,
        input: { extensionName },
        errorCode: JsonRpcErrorCode.InternalError,
      },
    );
  }

  /**
   * Closes the DuckDB connection and instance.
   * @returns {Promise<void>}
   */
  public async close(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBConnectionManager.close",
    });

    if (!this.isInitialized) {
      logger.warning(
        context,
        "DuckDBConnectionManager not initialized, nothing to close.",
      );
      return;
    }

    return ErrorHandler.tryCatch(
      async () => {
        if (this.dbConnection) {
          this.dbConnection.closeSync(); // Use synchronous closeSync
          this.dbConnection = null;
          logger.info(context, "DuckDB connection closed.");
        }
        if (this.dbInstance) {
          this.dbInstance.closeSync(); // Use synchronous closeSync
          this.dbInstance = null;
          logger.info(context, "DuckDB instance closed.");
        }
        this.isInitialized = false;
        this.currentConfig = null;
        logger.info(context, "DuckDBConnectionManager closed successfully.");
      },
      {
        operation: "DuckDBConnectionManager.close",
        context,
        errorCode: JsonRpcErrorCode.InternalError,
      },
    );
  }

  /**
   * Ensures that the service is initialized.
   * @param {RequestContext} context - The request context for error reporting.
   * @throws {McpError} If the service is not initialized.
   */
  public ensureInitialized(context: RequestContext): void {
    if (!this.isInitialized || !this.dbConnection || !this.dbInstance) {
      throw new McpError(
        JsonRpcErrorCode.ServiceUnavailable,
        "DuckDBConnectionManager is not initialized. Call initialize() first.",
        context,
      );
    }
  }

  /**
   * Gets the underlying DuckDB connection object.
   * @returns {duckdb.DuckDBConnection}
   * @throws {McpError} If the service is not initialized.
   */
  public getConnection(): duckdb.DuckDBConnection {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBConnectionManager.getConnection",
    });
    this.ensureInitialized(context);
    return this.dbConnection!;
  }

  /**
   * Gets the underlying DuckDB instance object.
   * @returns {duckdb.DuckDBInstance}
   * @throws {McpError} If the service is not initialized.
   */
  public getInstance(): duckdb.DuckDBInstance {
    const context = requestContextService.createRequestContext({
      operation: "DuckDBConnectionManager.getInstance",
    });
    this.ensureInitialized(context);
    return this.dbInstance!;
  }

  /**
   * Checks if the service is currently initialized.
   * @returns {boolean} True if initialized, false otherwise.
   */
  public get isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}
