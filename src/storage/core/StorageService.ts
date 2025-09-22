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
} from '@/storage/core/IStorageProvider.js';

function requireTenantId(context: RequestContext): string {
  if (!context.tenantId) {
    throw new McpError(
      JsonRpcErrorCode.InternalError,
      'Tenant ID is required for storage operations but was not found in the request context.',
      {
        operation: 'StorageService.requireTenantId',
        requestId: context.requestId,
      },
    );
  }
  return context.tenantId;
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

  list(prefix: string, context: RequestContext): Promise<string[]> {
    const tenantId = requireTenantId(context);
    return this.provider.list(tenantId, prefix, context);
  }
}
