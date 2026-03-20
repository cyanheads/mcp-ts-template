/**
 * @fileoverview An in-memory storage provider implementation.
 * Ideal for development, testing, or scenarios where persistence is not required.
 * Supports TTL (Time-To-Live) for entries and a configurable maximum entry count
 * to prevent unbounded memory growth.
 * @module src/storage/providers/inMemory/inMemoryProvider
 */
import type {
  IStorageProvider,
  ListOptions,
  ListResult,
  StorageOptions,
} from '@/storage/core/IStorageProvider.js';
import { decodeCursor, encodeCursor } from '@/storage/core/storageValidation.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';

const DEFAULT_LIST_LIMIT = 1000;
const DEFAULT_MAX_ENTRIES = 10_000;

/** Configuration options for the in-memory storage provider. */
export interface InMemoryProviderOptions {
  /**
   * Maximum number of entries across all tenants before the provider
   * rejects new writes. When capacity is reached, a TTL sweep runs first
   * to reclaim expired entries. If still at capacity after the sweep, `set()`
   * throws `McpError(InternalError)`.
   *
   * @default 10_000
   */
  maxEntries?: number;
}

interface InMemoryStoreEntry {
  expiresAt?: number;
  value: unknown;
}

export class InMemoryProvider implements IStorageProvider {
  private readonly store = new Map<string, Map<string, InMemoryStoreEntry>>();
  private readonly maxEntries: number;
  private entryCount = 0;

  constructor(options?: InMemoryProviderOptions) {
    this.maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  /** Returns the total number of entries across all tenants. */
  get size(): number {
    return this.entryCount;
  }

  private getTenantStore(tenantId: string): Map<string, InMemoryStoreEntry> {
    let tenantStore = this.store.get(tenantId);
    if (!tenantStore) {
      tenantStore = new Map<string, InMemoryStoreEntry>();
      this.store.set(tenantId, tenantStore);
    }
    return tenantStore;
  }

  /** Sweeps all tenant stores and removes expired entries, returning the count reclaimed. */
  private sweepExpired(): number {
    const now = Date.now();
    let reclaimed = 0;
    for (const [tenantId, tenantStore] of this.store) {
      for (const [key, entry] of tenantStore) {
        if (entry.expiresAt && now > entry.expiresAt) {
          tenantStore.delete(key);
          reclaimed++;
        }
      }
      if (tenantStore.size === 0) {
        this.store.delete(tenantId);
      }
    }
    this.entryCount -= reclaimed;
    return reclaimed;
  }

  /**
   * Ensures capacity for a new entry. If at limit, runs a TTL sweep first.
   * If still at capacity after sweep, throws.
   */
  private ensureCapacity(): void {
    if (this.entryCount < this.maxEntries) return;

    const reclaimed = this.sweepExpired();
    if (reclaimed > 0) {
      logger.debug(`[InMemoryProvider] TTL sweep reclaimed ${reclaimed} expired entries`);
    }

    if (this.entryCount >= this.maxEntries) {
      throw new McpError(
        JsonRpcErrorCode.InternalError,
        `In-memory storage capacity exceeded (max: ${this.maxEntries}). ` +
          'Consider increasing maxEntries, adding TTLs to entries, or switching to a persistent provider.',
      );
    }
  }

  get<T>(tenantId: string, key: string, context: RequestContext): Promise<T | null> {
    logger.debug(`[InMemoryProvider] Getting key: ${key} for tenant: ${tenantId}`, context);
    const tenantStore = this.getTenantStore(tenantId);
    const entry = tenantStore.get(key);

    if (!entry) {
      return Promise.resolve(null);
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      tenantStore.delete(key);
      this.entryCount--;
      logger.debug(
        `[InMemoryProvider] Key expired and removed: ${key} for tenant: ${tenantId}`,
        context,
      );
      return Promise.resolve(null);
    }

    return Promise.resolve(entry.value as T);
  }

  set(
    tenantId: string,
    key: string,
    value: unknown,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    logger.debug(`[InMemoryProvider] Setting key: ${key} for tenant: ${tenantId}`, context);
    const tenantStore = this.getTenantStore(tenantId);
    const isNew = !tenantStore.has(key);
    if (isNew) {
      this.ensureCapacity();
    }
    // Fix: Check for undefined instead of truthy to handle ttl=0 correctly
    const expiresAt = options?.ttl !== undefined ? Date.now() + options.ttl * 1000 : undefined;
    tenantStore.set(key, {
      value,
      ...(expiresAt !== undefined && { expiresAt }),
    });
    if (isNew) {
      this.entryCount++;
    }
    return Promise.resolve();
  }

  delete(tenantId: string, key: string, context: RequestContext): Promise<boolean> {
    logger.debug(`[InMemoryProvider] Deleting key: ${key} for tenant: ${tenantId}`, context);
    const tenantStore = this.getTenantStore(tenantId);
    const deleted = tenantStore.delete(key);
    if (deleted) {
      this.entryCount--;
    }
    return Promise.resolve(deleted);
  }

  list(
    tenantId: string,
    prefix: string,
    context: RequestContext,
    options?: ListOptions,
  ): Promise<ListResult> {
    logger.debug(`[InMemoryProvider] Listing keys with prefix: ${prefix} for tenant: ${tenantId}`, {
      ...context,
      options,
    });
    const tenantStore = this.getTenantStore(tenantId);
    const now = Date.now();
    const allKeys: string[] = [];

    // Collect all matching non-expired keys
    for (const [key, entry] of tenantStore.entries()) {
      if (key.startsWith(prefix)) {
        if (entry.expiresAt && now > entry.expiresAt) {
          tenantStore.delete(key); // Lazy cleanup
          this.entryCount--;
        } else {
          allKeys.push(key);
        }
      }
    }

    // Sort for consistent pagination
    allKeys.sort();

    // Apply pagination with opaque cursors
    const limit = options?.limit ?? DEFAULT_LIST_LIMIT;
    let startIndex = 0;

    if (options?.cursor) {
      // Decode and validate cursor
      const lastKey = decodeCursor(options.cursor, tenantId, context);
      const cursorIndex = allKeys.indexOf(lastKey);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      } else {
        // Key was deleted between pages; resume from the next key after it
        const insertionPoint = allKeys.findIndex((k) => k > lastKey);
        startIndex = insertionPoint === -1 ? allKeys.length : insertionPoint;
      }
    }

    const paginatedKeys = allKeys.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < allKeys.length && paginatedKeys.length > 0
        ? encodeCursor(paginatedKeys[paginatedKeys.length - 1] as string, tenantId)
        : undefined;

    return Promise.resolve({
      keys: paginatedKeys,
      nextCursor,
    });
  }

  async getMany<T>(
    tenantId: string,
    keys: string[],
    context: RequestContext,
  ): Promise<Map<string, T>> {
    if (keys.length === 0) {
      return new Map<string, T>();
    }

    logger.debug(`[InMemoryProvider] Getting ${keys.length} keys for tenant: ${tenantId}`, context);

    // Parallel fetch for better performance
    const promises = keys.map((key) => this.get<T>(tenantId, key, context));
    const values = await Promise.all(promises);

    const results = new Map<string, T>();
    keys.forEach((key, i) => {
      const value = values[i];
      if (value !== null) {
        results.set(key, value as T);
      }
    });

    logger.debug(
      `[InMemoryProvider] Retrieved ${results.size}/${keys.length} keys for tenant: ${tenantId}`,
      context,
    );
    return results;
  }

  async setMany(
    tenantId: string,
    entries: Map<string, unknown>,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    if (entries.size === 0) {
      return;
    }

    logger.debug(
      `[InMemoryProvider] Setting ${entries.size} keys for tenant: ${tenantId}`,
      context,
    );

    // Parallel set for better performance
    const promises = Array.from(entries.entries()).map(([key, value]) =>
      this.set(tenantId, key, value, context, options),
    );
    await Promise.all(promises);

    logger.debug(
      `[InMemoryProvider] Successfully set ${entries.size} keys for tenant: ${tenantId}`,
      context,
    );
  }

  async deleteMany(tenantId: string, keys: string[], context: RequestContext): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    logger.debug(
      `[InMemoryProvider] Deleting ${keys.length} keys for tenant: ${tenantId}`,
      context,
    );

    // Parallel delete for better performance
    const promises = keys.map((key) => this.delete(tenantId, key, context));
    const results = await Promise.all(promises);
    const deletedCount = results.filter((deleted) => deleted).length;

    logger.debug(
      `[InMemoryProvider] Deleted ${deletedCount}/${keys.length} keys for tenant: ${tenantId}`,
      context,
    );
    return deletedCount;
  }

  clear(tenantId: string, context: RequestContext): Promise<number> {
    logger.debug(`[InMemoryProvider] Clearing all keys for tenant: ${tenantId}`, context);
    const tenantStore = this.getTenantStore(tenantId);
    const count = tenantStore.size;
    tenantStore.clear();
    this.entryCount -= count;
    logger.info(`[InMemoryProvider] Cleared ${count} keys for tenant: ${tenantId}`, context);
    return Promise.resolve(count);
  }
}
