/**
 * @fileoverview Connection manager for SurrealDB with pooling and health checks.
 * Manages WebSocket connections with automatic reconnection and health monitoring.
 * @module src/storage/providers/surrealdb/core/connectionManager
 */

import Surreal from 'surrealdb';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';
import type { SurrealDbConfig, HealthCheckResult } from '../types.js';

/**
 * Manages SurrealDB connections with health monitoring and automatic recovery.
 *
 * @remarks
 * Provides connection pooling simulation (single connection with reconnect),
 * health checks, and graceful connection lifecycle management.
 */
export class ConnectionManager {
  private client: Surreal;
  private isConnected: boolean = false;
  private lastHealthCheck: number = 0;
  private readonly healthCheckInterval: number = 30000; // 30 seconds

  constructor(
    client: Surreal,
    private readonly config?: SurrealDbConfig,
  ) {
    this.client = client;
  }

  /**
   * Get the active SurrealDB client.
   * @throws {McpError} If connection is not established.
   */
  getClient(): Surreal {
    if (!this.isConnected && this.config) {
      throw new McpError(
        JsonRpcErrorCode.InternalError,
        'SurrealDB connection not established. Call connect() first.',
      );
    }
    return this.client;
  }

  /**
   * Establish connection to SurrealDB.
   * @param context Request context for logging.
   */
  async connect(context: RequestContext): Promise<void> {
    if (this.isConnected) {
      logger.debug('[ConnectionManager] Already connected', context);
      return;
    }

    if (!this.config) {
      logger.debug(
        '[ConnectionManager] No config provided, assuming pre-connected client',
        context,
      );
      this.isConnected = true;
      return;
    }

    return ErrorHandler.tryCatch(
      async () => {
        logger.info(
          `[ConnectionManager] Connecting to ${this.config!.url}`,
          context,
        );

        const connectOptions: {
          namespace: string;
          database: string;
          auth?: { username: string; password: string };
        } = {
          namespace: this.config!.namespace,
          database: this.config!.database,
        };

        if (this.config!.auth) {
          connectOptions.auth = this.config!.auth;
        }

        await this.client.connect(this.config!.url, connectOptions);

        this.isConnected = true;
        logger.info('[ConnectionManager] Connection established', context);
      },
      {
        operation: 'ConnectionManager.connect',
        context,
        input: { url: this.config.url },
      },
    );
  }

  /**
   * Close the SurrealDB connection.
   * @param context Request context for logging.
   */
  async disconnect(context: RequestContext): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    return ErrorHandler.tryCatch(
      async () => {
        await this.client.close();
        this.isConnected = false;
        logger.info('[ConnectionManager] Connection closed', context);
      },
      {
        operation: 'ConnectionManager.disconnect',
        context,
      },
    );
  }

  /**
   * Perform health check on the connection.
   * @param context Request context for logging.
   * @returns Health check result with status and response time.
   */
  async healthCheck(context: RequestContext): Promise<HealthCheckResult> {
    const now = Date.now();

    // Use cached result if recent
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return {
        healthy: this.isConnected,
        responseTime: 0,
      };
    }

    return ErrorHandler.tryCatch(
      async () => {
        const startTime = Date.now();

        try {
          // Simple ping query
          await this.client.query('SELECT 1 as ping');
          const responseTime = Date.now() - startTime;

          this.lastHealthCheck = now;
          return {
            healthy: true,
            responseTime,
          };
        } catch (error: unknown) {
          this.isConnected = false;
          return {
            healthy: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      {
        operation: 'ConnectionManager.healthCheck',
        context,
      },
    );
  }

  /**
   * Check if the connection is active.
   */
  isActive(): boolean {
    return this.isConnected;
  }
}
