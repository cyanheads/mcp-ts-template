/**
 * @fileoverview Barrel file for the storage module.
 * This file re-exports the main storage service and interfaces, providing a single
 * entry point for other parts of the application to interact with the storage layer.
 * @module src/storage
 */

export type {
  IStorageProvider,
  StorageOptions,
} from './core/IStorageProvider.js';
export { createStorageProvider } from './core/storageFactory.js';
export { storageService } from './core/StorageService.js';
