/**
 * @fileoverview Implements the IStorageProvider interface for Cloudflare R2.
 * @module src/storage/providers/cloudflare/r2Provider
 */
import type { R2Bucket, R2PutOptions } from '@cloudflare/workers-types';

import type { RequestContext } from '@/utils/index.js';
import { logger } from '@/utils/index.js';
import type {
  IStorageProvider,
  StorageOptions,
} from '@/storage/core/IStorageProvider.js';

export class R2Provider implements IStorageProvider {
  private bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  private getR2Key(tenantId: string, key: string): string {
    return `${tenantId}:${key}`;
  }

  async get<T>(
    tenantId: string,
    key: string,
    context: RequestContext,
  ): Promise<T | null> {
    const r2Key = this.getR2Key(tenantId, key);
    logger.debug(`[R2Provider] Getting key: ${r2Key}`, context);

    const object = await this.bucket.get(r2Key);

    if (object === null) {
      logger.debug(`[R2Provider] Key not found: ${r2Key}`, context);
      return null;
    }

    try {
      return await object.json<T>();
    } catch (error) {
      logger.error(`[R2Provider] Failed to parse JSON for key: ${r2Key}`, {
        ...context,
        error,
      });
      return null;
    }
  }

  async set(
    tenantId: string,
    key: string,
    value: unknown,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    const r2Key = this.getR2Key(tenantId, key);
    logger.debug(`[R2Provider] Setting key: ${r2Key}`, { ...context, options });

    const valueToStore = JSON.stringify(value);

    const putOptions: R2PutOptions = {};
    if (options?.ttl) {
      logger.warning(
        `[R2Provider] TTL is not natively supported by R2. The 'ttl' option for key '${r2Key}' will be ignored.`,
        context,
      );
    }

    await this.bucket.put(r2Key, valueToStore, putOptions);
    logger.debug(`[R2Provider] Successfully set key: ${r2Key}`, context);
  }

  async delete(
    tenantId: string,
    key: string,
    context: RequestContext,
  ): Promise<boolean> {
    const r2Key = this.getR2Key(tenantId, key);
    logger.debug(`[R2Provider] Deleting key: ${r2Key}`, context);

    const head = await this.bucket.head(r2Key);
    if (head === null) {
      logger.debug(`[R2Provider] Key to delete not found: ${r2Key}`, context);
      return false;
    }

    await this.bucket.delete(r2Key);
    logger.debug(`[R2Provider] Successfully deleted key: ${r2Key}`, context);
    return true;
  }

  async list(
    tenantId: string,
    prefix: string,
    context: RequestContext,
  ): Promise<string[]> {
    const r2Prefix = this.getR2Key(tenantId, prefix);
    logger.debug(`[R2Provider] Listing keys with prefix: ${r2Prefix}`, context);

    const listOptions = {
      prefix: r2Prefix,
    };

    const listed = await this.bucket.list(listOptions);
    const tenantPrefix = `${tenantId}:`;
    const keys = listed.objects.map((obj) =>
      obj.key.startsWith(tenantPrefix)
        ? obj.key.substring(tenantPrefix.length)
        : obj.key,
    );

    logger.debug(
      `[R2Provider] Found ${keys.length} keys with prefix: ${r2Prefix}`,
      context,
    );

    return keys;
  }
}
