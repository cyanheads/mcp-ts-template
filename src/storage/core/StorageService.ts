/**
 * @fileoverview Provides a singleton service for interacting with the application's storage layer.
 * This service acts as a proxy to the configured storage provider, ensuring a consistent
 * interface for all storage operations throughout the application. It must be initialized
 * at startup with a concrete provider instance created by the `storageFactory`.
 * @module src/storage/StorageService
 */

import { IStorageProvider, StorageOptions } from "./IStorageProvider.js";
import { RequestContext } from "../../utils/index.js";

class StorageService implements IStorageProvider {
  private provider: IStorageProvider | null = null;

  public initialize(provider: IStorageProvider) {
    this.provider = provider;
  }

  private getProvider(): IStorageProvider {
    if (!this.provider) {
      throw new Error(
        "StorageService has not been initialized. Call initialize() first.",
      );
    }
    return this.provider;
  }

  get<T>(key: string, context: RequestContext): Promise<T | null> {
    return this.getProvider().get(key, context);
  }

  set(
    key: string,
    value: unknown,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    return this.getProvider().set(key, value, context, options);
  }

  delete(key: string, context: RequestContext): Promise<boolean> {
    return this.getProvider().delete(key, context);
  }

  list(prefix: string, context: RequestContext): Promise<string[]> {
    return this.getProvider().list(prefix, context);
  }
}

export const storageService = new StorageService();
