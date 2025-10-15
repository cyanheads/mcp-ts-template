/**
 * @fileoverview Central type definitions for SurrealDB storage provider.
 * Consolidates all types used across the SurrealDB implementation.
 * @module src/storage/providers/surrealdb/types
 */

import type Surreal from 'surrealdb';

/**
 * Type alias for the SurrealDB client instance.
 * Provides semantic clarity and improved readability throughout the codebase.
 */
export type SurrealDb = Surreal;

/**
 * Represents a record in the SurrealDB kv_store table.
 * This structure stores key-value pairs with multi-tenancy support and TTL functionality.
 */
export interface KvStoreRecord {
  /**
   * The tenant ID for multi-tenancy isolation.
   * Required for all operations to ensure data separation between tenants.
   */
  tenant_id: string;

  /**
   * The unique key for the stored item within the tenant's namespace.
   */
  key: string;

  /**
   * The stored value. Can be any JSON-serializable data.
   * SurrealDB will store this as a flexible object/value type.
   */
  value: unknown;

  /**
   * Optional expiration timestamp.
   * If set, the record should be considered expired after this time.
   * Format: ISO 8601 datetime string.
   */
  expires_at?: string | null;

  /**
   * Timestamp when the record was created.
   * Format: ISO 8601 datetime string.
   */
  created_at?: string;

  /**
   * Timestamp when the record was last updated.
   * Format: ISO 8601 datetime string.
   */
  updated_at?: string;
}

/**
 * Input type for creating or updating records.
 * Omits the auto-generated fields (created_at, updated_at).
 */
export type KvStoreInput = Omit<KvStoreRecord, 'created_at' | 'updated_at'>;

/**
 * Configuration options for SurrealDB connection.
 */
export interface SurrealDbConfig {
  /**
   * The connection URL (ws:// or wss:// for cloud).
   */
  url: string;

  /**
   * Namespace to connect to.
   */
  namespace: string;

  /**
   * Database name within the namespace.
   */
  database: string;

  /**
   * Authentication credentials.
   */
  auth?: {
    username: string;
    password: string;
  };

  /**
   * Connection timeout in milliseconds.
   */
  timeout?: number;
}

/**
 * Query result wrapper from SurrealDB.
 */
export interface QueryResult<T = unknown> {
  result: T[];
  time?: string;
  status?: string;
}

/**
 * Transaction options for SurrealDB operations.
 */
export interface TransactionOptions {
  /**
   * Transaction timeout in milliseconds.
   */
  timeout?: number;

  /**
   * Isolation level (if supported).
   */
  isolationLevel?: 'read_committed' | 'serializable';
}

/**
 * Health check result for SurrealDB connection.
 */
export interface HealthCheckResult {
  /**
   * Whether the connection is healthy.
   */
  healthy: boolean;

  /**
   * Response time in milliseconds.
   */
  responseTime?: number;

  /**
   * Error message if unhealthy.
   */
  error?: string;

  /**
   * SurrealDB version info.
   */
  version?: string;
}
