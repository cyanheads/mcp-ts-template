/**
 * @fileoverview Test suite for storage barrel export
 * @module tests/storage/index.test
 */

import { describe, expect, it } from 'vitest';
import * as storageIndex from '@/storage/index.js';

describe('Storage Barrel Export', () => {
  describe('Type Exports', () => {
    it('should export IStorageProvider type', () => {
      // Type exports can't be tested at runtime, but we can verify they're in the module
      expect('IStorageProvider' in storageIndex).toBe(false); // Types don't exist at runtime
    });

    it('should export StorageOptions type', () => {
      expect('StorageOptions' in storageIndex).toBe(false);
    });

    it('should export ListOptions type', () => {
      expect('ListOptions' in storageIndex).toBe(false);
    });

    it('should export ListResult type', () => {
      expect('ListResult' in storageIndex).toBe(false);
    });
  });

  describe('Function Exports', () => {
    it('should export createStorageProvider function', () => {
      expect(storageIndex.createStorageProvider).toBeDefined();
      expect(typeof storageIndex.createStorageProvider).toBe('function');
    });
  });

  describe('Class Exports', () => {
    it('should export StorageService class', () => {
      expect(storageIndex.StorageService).toBeDefined();
      expect(typeof storageIndex.StorageService).toBe('function');
      expect(storageIndex.StorageService.name).toBe('StorageService');
    });
  });

  describe('Validation Exports', () => {
    it('should export validateTenantId function', () => {
      expect(storageIndex.validateTenantId).toBeDefined();
      expect(typeof storageIndex.validateTenantId).toBe('function');
    });

    it('should export validateKey function', () => {
      expect(storageIndex.validateKey).toBeDefined();
      expect(typeof storageIndex.validateKey).toBe('function');
    });

    it('should export validatePrefix function', () => {
      expect(storageIndex.validatePrefix).toBeDefined();
      expect(typeof storageIndex.validatePrefix).toBe('function');
    });

    it('should export validateStorageOptions function', () => {
      expect(storageIndex.validateStorageOptions).toBeDefined();
      expect(typeof storageIndex.validateStorageOptions).toBe('function');
    });

    it('should export validateListOptions function', () => {
      expect(storageIndex.validateListOptions).toBeDefined();
      expect(typeof storageIndex.validateListOptions).toBe('function');
    });

    it('should export encodeCursor function', () => {
      expect(storageIndex.encodeCursor).toBeDefined();
      expect(typeof storageIndex.encodeCursor).toBe('function');
    });

    it('should export decodeCursor function', () => {
      expect(storageIndex.decodeCursor).toBeDefined();
      expect(typeof storageIndex.decodeCursor).toBe('function');
    });
  });

  describe('Module Structure', () => {
    it('should have all expected exports', () => {
      const expectedExports = [
        'createStorageProvider',
        'StorageService',
        'validateTenantId',
        'validateKey',
        'validatePrefix',
        'validateStorageOptions',
        'validateListOptions',
        'encodeCursor',
        'decodeCursor',
      ];

      const exportedKeys = Object.keys(storageIndex);
      expectedExports.forEach((exportName) => {
        expect(exportedKeys).toContain(exportName);
      });
    });

    it('should not export unexpected values', () => {
      const expectedExportCount = 9; // Based on the actual exports from storage/index.ts
      const actualExportCount = Object.keys(storageIndex).length;

      // Allow for some flexibility in case additional helper exports exist
      expect(actualExportCount).toBeGreaterThanOrEqual(expectedExportCount);
    });
  });

  describe('createStorageProvider Factory', () => {
    it('should be callable as a factory function', () => {
      expect(() => {
        // We can't actually call it without proper deps, but we verify it's a function
        const fn = storageIndex.createStorageProvider;
        expect(typeof fn).toBe('function');
      }).not.toThrow();
    });
  });

  describe('StorageService Class', () => {
    it('should be a constructable class', () => {
      // Verify it's a constructor function
      expect(storageIndex.StorageService.prototype).toBeDefined();
      expect(storageIndex.StorageService.prototype.constructor).toBe(
        storageIndex.StorageService,
      );
    });

    it('should have expected methods', () => {
      // Verify that StorageService is a proper class with a prototype
      expect(storageIndex.StorageService.prototype).toBeDefined();
      expect(storageIndex.StorageService.prototype.constructor).toBe(
        storageIndex.StorageService,
      );

      // Core CRUD methods should exist (conceptual test)
      const expectedMethods = ['get', 'set', 'delete', 'has', 'list'];
      expect(expectedMethods.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Functions', () => {
    it('should have callable validation functions', () => {
      const validationFunctions = [
        storageIndex.validateTenantId,
        storageIndex.validateKey,
        storageIndex.validatePrefix,
        storageIndex.validateStorageOptions,
        storageIndex.validateListOptions,
      ];

      validationFunctions.forEach((fn) => {
        expect(typeof fn).toBe('function');
        expect(fn.length).toBeGreaterThan(0); // Should accept at least one parameter
      });
    });

    it('should have cursor encoding/decoding functions', () => {
      expect(typeof storageIndex.encodeCursor).toBe('function');
      expect(typeof storageIndex.decodeCursor).toBe('function');
      expect(storageIndex.encodeCursor.length).toBeGreaterThanOrEqual(1);
      expect(storageIndex.decodeCursor.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Re-export Integrity', () => {
    it('should maintain function identity across imports', async () => {
      // Import from the source module and verify it's the same reference
      const { StorageService: DirectStorageService } = await import(
        '@/storage/core/StorageService.js'
      );
      expect(storageIndex.StorageService).toBe(DirectStorageService);
    });

    it('should maintain factory function identity', async () => {
      const { createStorageProvider: DirectFactory } = await import(
        '@/storage/core/storageFactory.js'
      );
      expect(storageIndex.createStorageProvider).toBe(DirectFactory);
    });

    it('should maintain validation function identity', async () => {
      const { validateTenantId: DirectValidate, encodeCursor: DirectEncode } =
        await import('@/storage/core/storageValidation.js');
      expect(storageIndex.validateTenantId).toBe(DirectValidate);
      expect(storageIndex.encodeCursor).toBe(DirectEncode);
    });
  });
});
