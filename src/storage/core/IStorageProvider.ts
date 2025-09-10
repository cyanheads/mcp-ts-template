/**
 * @fileoverview Defines the core interface for a generic storage provider.
 * This contract ensures that any storage implementation (e.g., in-memory, filesystem, database)
 * can be used interchangeably throughout the application.
 * @module src/storage/IStorageProvider
 */
import { RequestContext } from '../../utils/index.js';

/**
 * Options for storage operations.
 */
export interface StorageOptions {
  /**
   * Time-to-live for the stored item, in seconds.
   * If not provided, the item will be stored indefinitely.
   */
  ttl?: number;
}

/**
 * Defines the contract for a generic storage provider.
 * All methods must be asynchronous and accept a RequestContext for tracing and logging.
 */
export interface IStorageProvider {
  /**
   * Retrieves a value from the storage.
   * @param key The unique key for the item.
   * @param context The request context for logging and tracing.
   * @returns A promise that resolves to the stored value, or null if not found.
   */
  get<T>(key: string, context: RequestContext): Promise<T | null>;

  /**
   * Stores a value in the storage.
   * @param key The unique key for the item.
   * @param value The value to store. Can be any serializable object.
   * @param context The request context for logging and tracing.
   * @param options Optional settings like TTL.
   * @returns A promise that resolves when the operation is complete.
   */
  set(
    key: string,
    value: unknown,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void>;

  /**
   * Deletes a value from the storage.
   * @param key The unique key for the item to delete.
   * @param context The request context for logging and tracing.
   * @returns A promise that resolves to true if the item was deleted, false if not found.
   */
  delete(key: string, context: RequestContext): Promise<boolean>;

  /**
   * Lists all keys that match a given prefix.
   * Note: This may be an expensive operation on some backends.
   * @param prefix The prefix to match keys against.
   * @param context The request context for logging and tracing.
   * @returns A promise that resolves to an array of matching keys.
   */
  list(prefix: string, context: RequestContext): Promise<string[]>;
}
