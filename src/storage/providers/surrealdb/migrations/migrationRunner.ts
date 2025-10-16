/**
 * @fileoverview Migration runner for SurrealDB schema management.
 * Handles versioned schema migrations with rollback support.
 * @module src/storage/providers/surrealdb/migrations/migrationRunner
 */

import type Surreal from 'surrealdb';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';
import type {
  Migration,
  MigrationResult,
  MigrationHistory,
  MigrationPlan,
  MigrationDirection,
} from './migrationTypes.js';

/**
 * Manages schema migrations for SurrealDB.
 *
 * @remarks
 * Provides:
 * - Version-controlled schema evolution
 * - Rollback support
 * - Migration history tracking
 * - Dependency management
 *
 * @example
 * ```ts
 * const runner = new MigrationRunner(client);
 *
 * const migration: Migration = {
 *   id: '001_add_user_table',
 *   name: 'Create user table',
 *   up: 'DEFINE TABLE user...',
 *   down: 'REMOVE TABLE user;'
 * };
 *
 * await runner.migrate([migration], 'up', context);
 * ```
 */
export class MigrationRunner {
  private readonly historyTable = 'migration_history';

  constructor(private readonly client: Surreal) {}

  /**
   * Initialize migration history table.
   *
   * @param context - Request context
   */
  async initialize(context: RequestContext): Promise<void> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.info('[MigrationRunner] Initializing migration system', context);

        const schema = `
          DEFINE TABLE ${this.historyTable} SCHEMAFULL
            PERMISSIONS FOR select, create, update FULL;

          DEFINE FIELD migration_id ON TABLE ${this.historyTable}
            TYPE string;

          DEFINE FIELD name ON TABLE ${this.historyTable}
            TYPE string;

          DEFINE FIELD status ON TABLE ${this.historyTable}
            TYPE string;

          DEFINE FIELD applied_at ON TABLE ${this.historyTable}
            TYPE option<datetime>;

          DEFINE FIELD rolled_back_at ON TABLE ${this.historyTable}
            TYPE option<datetime>;

          DEFINE FIELD error ON TABLE ${this.historyTable}
            TYPE option<string>;

          DEFINE INDEX idx_migration_id ON TABLE ${this.historyTable}
            COLUMNS migration_id
            UNIQUE;
        `;

        await this.client.query(schema);

        logger.info('[MigrationRunner] Migration system initialized', context);
      },
      {
        operation: 'MigrationRunner.initialize',
        context,
      },
    );
  }

  /**
   * Run migrations in the specified direction.
   *
   * @param migrations - Migrations to execute
   * @param direction - 'up' to apply, 'down' to rollback
   * @param context - Request context
   * @returns Array of migration results
   */
  async migrate(
    migrations: Migration[],
    direction: MigrationDirection,
    context: RequestContext,
  ): Promise<MigrationResult[]> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.info(
          `[MigrationRunner] Running ${migrations.length} migrations (${direction})`,
          context,
        );

        const results: MigrationResult[] = [];

        for (const migration of migrations) {
          const result = await this.executeMigration(
            migration,
            direction,
            context,
          );
          results.push(result);

          if (!result.success) {
            logger.error(
              `[MigrationRunner] Migration failed: ${migration.id}`,
              context,
            );
            break; // Stop on first failure
          }
        }

        logger.info(
          `[MigrationRunner] Completed ${results.filter((r) => r.success).length}/${migrations.length} migrations`,
          context,
        );

        return results;
      },
      {
        operation: 'MigrationRunner.migrate',
        context,
        input: { count: migrations.length, direction },
      },
    );
  }

  /**
   * Get migration history.
   *
   * @param context - Request context
   * @returns Array of migration history records
   */
  async getHistory(context: RequestContext): Promise<MigrationHistory[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = `SELECT * FROM ${this.historyTable} ORDER BY applied_at ASC`;

        const result =
          await this.client.query<[{ result: MigrationHistory[] }]>(query);

        return result[0]?.result ?? [];
      },
      {
        operation: 'MigrationRunner.getHistory',
        context,
      },
    );
  }

  /**
   * Create a migration plan (determine which migrations to run).
   *
   * @param migrations - All available migrations
   * @param direction - Migration direction
   * @param context - Request context
   * @returns Migration plan
   */
  async createPlan(
    migrations: Migration[],
    direction: MigrationDirection,
    context: RequestContext,
  ): Promise<MigrationPlan> {
    const history = await this.getHistory(context);
    const appliedIds = new Set(
      history.filter((h) => h.status === 'applied').map((h) => h.migration_id),
    );

    let toExecute: Migration[];

    if (direction === 'up') {
      // Only run migrations not yet applied
      toExecute = migrations.filter((m) => !appliedIds.has(m.id));
    } else {
      // Rollback applied migrations in reverse order
      toExecute = migrations.filter((m) => appliedIds.has(m.id)).reverse();
    }

    return {
      migrations: toExecute,
      count: toExecute.length,
      direction,
    };
  }

  /**
   * Execute a single migration.
   */
  private async executeMigration(
    migration: Migration,
    direction: MigrationDirection,
    context: RequestContext,
  ): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      logger.info(
        `[MigrationRunner] Executing migration: ${migration.id} (${direction})`,
        context,
      );

      const sql = direction === 'up' ? migration.up : migration.down;

      // Execute within transaction
      await this.client.query('BEGIN TRANSACTION');

      try {
        // Run migration SQL
        await this.client.query(sql);

        // Update history
        await this.recordMigration(migration, direction, null, context);

        await this.client.query('COMMIT TRANSACTION');

        const duration = Date.now() - startTime;

        logger.info(
          `[MigrationRunner] Migration succeeded: ${migration.id} (${duration}ms)`,
          context,
        );

        return {
          id: migration.id,
          success: true,
          duration,
        };
      } catch (error: unknown) {
        await this.client.query('CANCEL TRANSACTION');
        throw error;
      }
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      logger.error(
        `[MigrationRunner] Migration failed: ${migration.id} - ${errorMsg}`,
        context,
      );

      await this.recordMigration(migration, direction, errorMsg, context);

      return {
        id: migration.id,
        success: false,
        error: errorMsg,
        duration,
      };
    }
  }

  /**
   * Record migration in history table.
   */
  private async recordMigration(
    migration: Migration,
    direction: MigrationDirection,
    error: string | null,
    _context: RequestContext,
  ): Promise<void> {
    const status = error
      ? 'failed'
      : direction === 'up'
        ? 'applied'
        : 'rolled_back';

    const query = `
      UPDATE ${this.historyTable} SET
        status = $status,
        ${direction === 'up' ? 'applied_at' : 'rolled_back_at'} = time::now(),
        ${error ? 'error = $error' : ''}
      WHERE migration_id = $migration_id
      OR CREATE ${this.historyTable} SET
        migration_id = $migration_id,
        name = $name,
        status = $status,
        ${direction === 'up' ? 'applied_at' : 'rolled_back_at'} = time::now()
        ${error ? ', error = $error' : ''}
    `;

    await this.client.query(query, {
      migration_id: migration.id,
      name: migration.name,
      status,
      ...(error && { error }),
    });
  }
}
