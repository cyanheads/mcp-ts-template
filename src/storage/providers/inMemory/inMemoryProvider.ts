/**
 * @fileoverview An in-memory storage provider implementation.
 * Ideal for development, testing, or scenarios where persistence is not required.
 * Supports TTL (Time-To-Live) for entries.
 * @module src/storage/providers/inMemory/inMemoryProvider
 */
import { type RequestContext, logger } from '@/utils/index.js';
import type {
  IStorageProvider,
  StorageOptions,
} from '@/storage/core/IStorageProvider.js';

interface InMemoryStoreEntry {
  value: unknown;
  expiresAt?: number;
}

export class InMemoryProvider implements IStorageProvider {
  private readonly store = new Map<string, Map<string, InMemoryStoreEntry>>();

  private getTenantStore(tenantId: string): Map<string, InMemoryStoreEntry> {
    let tenantStore = this.store.get(tenantId);
    if (!tenantStore) {
      tenantStore = new Map<string, InMemoryStoreEntry>();
      this.store.set(tenantId, tenantStore);
    }
    return tenantStore;
  }

  get<T>(
    tenantId: string,
    key: string,
    context: RequestContext,
  ): Promise<T | null> {
    logger.debug(
      `[InMemoryProvider] Getting key: ${key} for tenant: ${tenantId}`,
      context,
    );
    const tenantStore = this.getTenantStore(tenantId);
    const entry = tenantStore.get(key);

    if (!entry) {
      return Promise.resolve(null);
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      tenantStore.delete(key);
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
    logger.debug(
      `[InMemoryProvider] Setting key: ${key} for tenant: ${tenantId}`,
      context,
    );
    const tenantStore = this.getTenantStore(tenantId);
    const expiresAt = options?.ttl
      ? Date.now() + options.ttl * 1000
      : undefined;
    tenantStore.set(key, {
      value,
      ...(expiresAt && { expiresAt }),
    });
    return Promise.resolve();
  }

  delete(
    tenantId: string,
    key: string,
    context: RequestContext,
  ): Promise<boolean> {
    logger.debug(
      `[InMemoryProvider] Deleting key: ${key} for tenant: ${tenantId}`,
      context,
    );
    const tenantStore = this.getTenantStore(tenantId);
    return Promise.resolve(tenantStore.delete(key));
  }

  list(
    tenantId: string,
    prefix: string,
    context: RequestContext,
  ): Promise<string[]> {
    logger.debug(
      `[InMemoryProvider] Listing keys with prefix: ${prefix} for tenant: ${tenantId}`,
      context,
    );
    const tenantStore = this.getTenantStore(tenantId);
    const now = Date.now();
    const keys: string[] = [];
    for (const [key, entry] of tenantStore.entries()) {
      if (key.startsWith(prefix)) {
        if (entry.expiresAt && now > entry.expiresAt) {
          tenantStore.delete(key); // Lazy cleanup
        } else {
          keys.push(key);
        }
      }
    }
    return Promise.resolve(keys);
  }
}
