/**
 * @fileoverview Provides a singleton service for interacting with the application's storage layer.
 * This service acts as a proxy to the configured storage provider, ensuring a consistent
 * interface for all storage operations throughout the application. It receives its concrete
 * provider via dependency injection.
 * @module src/storage/core/StorageService
 */
import { injectable, inject } from 'tsyringe';

import { StorageProvider } from '@/container/tokens.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import type { RequestContext } from '@/utils/index.js';
import type {
  IStorageProvider,
  StorageOptions,
  ListOptions,
  ListResult,
} from '@/storage/core/IStorageProvider.js';
import {
  validateTenantId,
  validateKey,
  validatePrefix,
  validateStorageOptions,
} from '@/storage/core/storageValidation.js';

/**
 * Validates and returns the tenant ID from the request context.
 * Ensures the tenant ID is present and delegates to shared validation logic.
 *
 * @param context - The request context containing the tenant ID
 * @returns The validated tenant ID (trimmed)
 * @throws {McpError} If tenant ID is missing or invalid
 */
function requireTenantId(context: RequestContext): string {
  const tenantId = context.tenantId;

  // Check if tenant ID is missing (undefined or null)
  if (tenantId === undefined || tenantId === null) {
    throw new McpError(
      JsonRpcErrorCode.InternalError,
      'Tenant ID is required for storage operations but was not found in the request context.',
      {
        operation: 'StorageService.requireTenantId',
        requestId: context.requestId,
      },
    );
  }

  // Delegate validation to shared utility
  validateTenantId(tenantId, context);

  return tenantId.trim();
}

@injectable()
export class StorageService {
  constructor(@inject(StorageProvider) private provider: IStorageProvider) {}

  get<T>(key: string, context: RequestContext): Promise<T | null> {
    const tenantId = requireTenantId(context);
    validateKey(key, context);
    return this.provider.get(tenantId, key, context);
  }

  set(
    key: string,
    value: unknown,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    const tenantId = requireTenantId(context);
    validateKey(key, context);
    validateStorageOptions(options, context);
    return this.provider.set(tenantId, key, value, context, options);
  }

  delete(key: string, context: RequestContext): Promise<boolean> {
    const tenantId = requireTenantId(context);
    validateKey(key, context);
    return this.provider.delete(tenantId, key, context);
  }

  list(
    prefix: string,
    context: RequestContext,
    options?: ListOptions,
  ): Promise<ListResult> {
    const tenantId = requireTenantId(context);
    validatePrefix(prefix, context);
    return this.provider.list(tenantId, prefix, context, options);
  }

  getMany<T>(keys: string[], context: RequestContext): Promise<Map<string, T>> {
    const tenantId = requireTenantId(context);
    // Validate all keys
    for (const key of keys) {
      validateKey(key, context);
    }
    return this.provider.getMany(tenantId, keys, context);
  }

  setMany(
    entries: Map<string, unknown>,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    const tenantId = requireTenantId(context);
    validateStorageOptions(options, context);
    // Validate all keys
    for (const key of entries.keys()) {
      validateKey(key, context);
    }
    return this.provider.setMany(tenantId, entries, context, options);
  }

  deleteMany(keys: string[], context: RequestContext): Promise<number> {
    const tenantId = requireTenantId(context);
    // Validate all keys
    for (const key of keys) {
      validateKey(key, context);
    }
    return this.provider.deleteMany(tenantId, keys, context);
  }

  clear(context: RequestContext): Promise<number> {
    const tenantId = requireTenantId(context);
    return this.provider.clear(tenantId, context);
  }
}
