/**
 * @fileoverview Provides a singleton service for interacting with the application's storage layer.
 * This service acts as a proxy to the configured storage provider, ensuring a consistent
 * interface for all storage operations throughout the application. It receives its concrete
 * provider via dependency injection.
 * @module src/storage/core/StorageService
 */
import { injectable, inject } from 'tsyringe';
import { StorageProvider } from '@/container/tokens.js';
import type { RequestContext } from '@/utils/index.js';
import type {
  IStorageProvider,
  StorageOptions,
} from '@/storage/core/IStorageProvider.js';

@injectable()
export class StorageService implements IStorageProvider {
  constructor(@inject(StorageProvider) private provider: IStorageProvider) {}

  get<T>(key: string, context: RequestContext): Promise<T | null> {
    return this.provider.get(key, context);
  }

  set(
    key: string,
    value: unknown,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    return this.provider.set(key, value, context, options);
  }

  delete(key: string, context: RequestContext): Promise<boolean> {
    return this.provider.delete(key, context);
  }

  list(prefix: string, context: RequestContext): Promise<string[]> {
    return this.provider.list(prefix, context);
  }
}
