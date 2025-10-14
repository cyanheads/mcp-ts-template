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

/**
 * Validates and returns the tenant ID from the request context.
 * Ensures the tenant ID is present, non-empty, and follows security constraints.
 *
 * Security constraints:
 * - Must be non-empty string
 * - Maximum length: 128 characters
 * - Allowed characters: alphanumeric, hyphens, underscores, dots
 * - Cannot contain path traversal sequences (../)
 * - Cannot start or end with special characters
 *
 * @param context - The request context containing the tenant ID
 * @returns The validated tenant ID
 * @throws {McpError} If tenant ID is missing, invalid, or violates security constraints
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

  // Check if tenant ID is not a string or is empty/whitespace
  if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Tenant ID cannot be an empty string.',
      {
        operation: 'StorageService.requireTenantId',
        requestId: context.requestId,
        tenantId,
      },
    );
  }

  const trimmedTenantId = tenantId.trim();

  // Check maximum length
  if (trimmedTenantId.length > 128) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Tenant ID exceeds maximum length of 128 characters.',
      {
        operation: 'StorageService.requireTenantId',
        requestId: context.requestId,
        tenantIdLength: trimmedTenantId.length,
      },
    );
  }

  // Validate character set: alphanumeric, hyphens, underscores, dots only
  // This prevents path traversal and special character injection
  // Single character: must be alphanumeric
  // Multiple characters: must start and end with alphanumeric, middle can include ._-
  const validTenantIdPattern =
    /^[a-zA-Z0-9]$|^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/;
  if (!validTenantIdPattern.test(trimmedTenantId)) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Tenant ID contains invalid characters. Only alphanumeric characters, hyphens, underscores, and dots are allowed. Must start and end with alphanumeric characters.',
      {
        operation: 'StorageService.requireTenantId',
        requestId: context.requestId,
        tenantId: trimmedTenantId,
      },
    );
  }

  // Check for path traversal attempts
  if (trimmedTenantId.includes('../') || trimmedTenantId.includes('..\\')) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Tenant ID contains path traversal sequences, which are not allowed.',
      {
        operation: 'StorageService.requireTenantId',
        requestId: context.requestId,
        tenantId: trimmedTenantId,
      },
    );
  }

  // Check for consecutive dots (potential bypass)
  if (trimmedTenantId.includes('..')) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Tenant ID contains consecutive dots, which are not allowed.',
      {
        operation: 'StorageService.requireTenantId',
        requestId: context.requestId,
        tenantId: trimmedTenantId,
      },
    );
  }

  return trimmedTenantId;
}

@injectable()
export class StorageService {
  constructor(@inject(StorageProvider) private provider: IStorageProvider) {}

  get<T>(key: string, context: RequestContext): Promise<T | null> {
    const tenantId = requireTenantId(context);
    return this.provider.get(tenantId, key, context);
  }

  set(
    key: string,
    value: unknown,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    const tenantId = requireTenantId(context);
    return this.provider.set(tenantId, key, value, context, options);
  }

  delete(key: string, context: RequestContext): Promise<boolean> {
    const tenantId = requireTenantId(context);
    return this.provider.delete(tenantId, key, context);
  }

  list(
    prefix: string,
    context: RequestContext,
    options?: ListOptions,
  ): Promise<ListResult> {
    const tenantId = requireTenantId(context);
    return this.provider.list(tenantId, prefix, context, options);
  }

  getMany<T>(keys: string[], context: RequestContext): Promise<Map<string, T>> {
    const tenantId = requireTenantId(context);
    return this.provider.getMany(tenantId, keys, context);
  }

  setMany(
    entries: Map<string, unknown>,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    const tenantId = requireTenantId(context);
    return this.provider.setMany(tenantId, entries, context, options);
  }

  deleteMany(keys: string[], context: RequestContext): Promise<number> {
    const tenantId = requireTenantId(context);
    return this.provider.deleteMany(tenantId, keys, context);
  }

  clear(context: RequestContext): Promise<number> {
    const tenantId = requireTenantId(context);
    return this.provider.clear(tenantId, context);
  }
}
