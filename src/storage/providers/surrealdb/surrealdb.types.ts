/**
 * @fileoverview Type definitions for SurrealDB storage provider.
 * Defines the schema and types for the key-value store table in SurrealDB.
 * @module src/storage/providers/surrealdb/surrealdb.types
 */

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
