/**
 * @fileoverview An in-memory storage provider implementation.
 * Ideal for development, testing, or scenarios where persistence is not required.
 * Supports TTL (Time-To-Live) for entries.
 * @module src/storage/providers/inMemory/inMemoryProvider
 */

import { logger, RequestContext } from "../../../utils/index.js";
import {
  IStorageProvider,
  StorageOptions,
} from "../../core/IStorageProvider.js";

interface InMemoryStoreEntry {
  value: unknown;
  expiresAt?: number;
}

export class InMemoryProvider implements IStorageProvider {
  private readonly store = new Map<string, InMemoryStoreEntry>();

  get<T>(key: string, context: RequestContext): Promise<T | null> {
    logger.debug(`[InMemoryProvider] Getting key: ${key}`, context);
    const entry = this.store.get(key);

    if (!entry) {
      return Promise.resolve(null);
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      logger.debug(
        `[InMemoryProvider] Key expired and removed: ${key}`,
        context,
      );
      return Promise.resolve(null);
    }

    return Promise.resolve(entry.value as T);
  }

  set(
    key: string,
    value: unknown,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    logger.debug(`[InMemoryProvider] Setting key: ${key}`, context);
    const expiresAt = options?.ttl
      ? Date.now() + options.ttl * 1000
      : undefined;
    this.store.set(key, {
      value,
      ...(expiresAt && { expiresAt }),
    });
    return Promise.resolve();
  }

  delete(key: string, context: RequestContext): Promise<boolean> {
    logger.debug(`[InMemoryProvider] Deleting key: ${key}`, context);
    return Promise.resolve(this.store.delete(key));
  }

  list(prefix: string, context: RequestContext): Promise<string[]> {
    logger.debug(
      `[InMemoryProvider] Listing keys with prefix: ${prefix}`,
      context,
    );
    const now = Date.now();
    const keys: string[] = [];
    for (const [key, entry] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        if (entry.expiresAt && now > entry.expiresAt) {
          this.store.delete(key); // Lazy cleanup
        } else {
          keys.push(key);
        }
      }
    }
    return Promise.resolve(keys);
  }
}
