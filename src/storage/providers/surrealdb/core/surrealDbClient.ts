/**
 * @fileoverview Centralized SurrealDB client for managing connections and services.
 * @module src/storage/providers/surrealdb/core/surrealDbClient
 */

import Surreal from 'surrealdb';
import { type RequestContext } from '@/utils/index.js';
import { ConnectionManager } from './connectionManager.js';
import { TransactionManager } from './transactionManager.js';
import { AuthManager } from '../auth/authManager.js';
import { GraphOperations } from '../graph/graphOperations.js';
import { EventManager } from '../events/eventManager.js';
import { CustomFunctions } from '../functions/customFunctions.js';
import { MigrationRunner } from '../migrations/migrationRunner.js';
import { SchemaIntrospector } from '../introspection/schemaIntrospector.js';
import type { SurrealDbConfig } from '../types.js';

/**
 * A centralized client for interacting with SurrealDB.
 * Manages the connection and provides access to various feature managers.
 *
 * @remarks
 * This class serves as the main entry point for all SurrealDB operations.
 * It centralizes connection management and provides factory methods for
 * accessing specialized feature managers (auth, graph, events, etc.).
 *
 * The client promotes composition over inheritance, allowing each manager
 * to focus on its specific domain while sharing the underlying connection.
 *
 * @example
 * ```ts
 * // Create and connect client
 * const client = new SurrealDbClient(config);
 * await client.connect(context);
 *
 * // Use auth manager
 * await client.auth().configureJwt({ ... }, context);
 *
 * // Use graph operations
 * const edge = await client.graph().createEdge(...);
 *
 * // Clean up
 * await client.disconnect(context);
 * ```
 */
export class SurrealDbClient {
  private readonly client: Surreal;
  public readonly connection: ConnectionManager;
  public readonly transactions: TransactionManager;

  constructor(config?: SurrealDbConfig) {
    this.client = new Surreal();
    this.connection = new ConnectionManager(this.client, config);
    this.transactions = new TransactionManager(this.client);
  }

  /**
   * Connects to the SurrealDB instance.
   * @param context - The request context for logging.
   */
  public async connect(context: RequestContext): Promise<void> {
    await this.connection.connect(context);
  }

  /**
   * Disconnects from the SurrealDB instance.
   * @param context - The request context for logging.
   */
  public async disconnect(context: RequestContext): Promise<void> {
    await this.connection.disconnect(context);
  }

  /**
   * Get the underlying Surreal client instance.
   * @returns The Surreal client instance.
   */
  public getClient(): Surreal {
    return this.client;
  }

  /**
   * Provides access to the authentication manager.
   * @returns An instance of AuthManager.
   */
  public auth(): AuthManager {
    return new AuthManager(this.client);
  }

  /**
   * Provides access to the graph operations manager.
   * @returns An instance of GraphOperations.
   */
  public graph(): GraphOperations {
    return new GraphOperations(this.client);
  }

  /**
   * Provides access to the event manager.
   * @returns An instance of EventManager.
   */
  public events(): EventManager {
    return new EventManager(this.client);
  }

  /**
   * Provides access to the custom functions manager.
   * @returns An instance of CustomFunctions.
   */
  public functions(): CustomFunctions {
    return new CustomFunctions(this.client);
  }

  /**
   * Provides access to the migration runner.
   * @returns An instance of MigrationRunner.
   */
  public migrations(): MigrationRunner {
    return new MigrationRunner(this.client);
  }

  /**
   * Provides access to the schema introspector.
   * @returns An instance of SchemaIntrospector.
   */
  public introspector(): SchemaIntrospector {
    return new SchemaIntrospector(this.client);
  }
}
