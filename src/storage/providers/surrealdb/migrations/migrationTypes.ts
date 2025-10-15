/**
 * @fileoverview Type definitions for SurrealDB schema migrations.
 * @module src/storage/providers/surrealdb/migrations/migrationTypes
 */

/**
 * Migration direction.
 */
export type MigrationDirection = 'up' | 'down';

/**
 * Migration status.
 */
export type MigrationStatus = 'pending' | 'applied' | 'failed' | 'rolled_back';

/**
 * A single schema migration.
 */
export interface Migration {
  /** Unique migration identifier (e.g., '001_create_users_table') */
  id: string;
  /** Migration name/description */
  name: string;
  /** SQL to apply migration */
  up: string;
  /** SQL to rollback migration */
  down: string;
  /** When this migration was created */
  createdAt?: Date;
  /** Dependencies (migration IDs that must run first) */
  dependencies?: string[];
}

/**
 * Migration execution result.
 */
export interface MigrationResult {
  /** Migration ID */
  id: string;
  /** Whether migration succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Execution time in milliseconds */
  duration?: number;
}

/**
 * Migration history record.
 */
export interface MigrationHistory {
  /** Migration ID */
  migration_id: string;
  /** Migration name */
  name: string;
  /** Current status */
  status: MigrationStatus;
  /** When it was applied */
  applied_at?: string;
  /** When it was rolled back */
  rolled_back_at?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Migration plan (ordered list of migrations to execute).
 */
export interface MigrationPlan {
  /** Migrations to execute in order */
  migrations: Migration[];
  /** Total count */
  count: number;
  /** Direction (up or down) */
  direction: MigrationDirection;
}
