/**
 * @fileoverview Tests for StorageService tenant ID validation and security.
 * @module tests/storage/StorageService.test
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { container } from 'tsyringe';

import { StorageService } from '@/storage/core/StorageService.js';
import { InMemoryProvider } from '@/storage/providers/inMemory/inMemoryProvider.js';
import { StorageProvider } from '@/container/tokens.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { requestContextService } from '@/utils/index.js';
import type { RequestContext } from '@/utils/index.js';

describe('StorageService - Tenant ID Validation', () => {
  let storageService: StorageService;
  let baseContext: RequestContext;

  beforeEach(() => {
    // Register a fresh in-memory provider for each test
    container.clearInstances();
    container.registerSingleton(StorageProvider, InMemoryProvider);
    storageService = container.resolve(StorageService);

    baseContext = requestContextService.createRequestContext({
      operation: 'test-storage-service',
    });
  });

  describe('Valid Tenant IDs', () => {
    it('should accept simple alphanumeric tenant ID', async () => {
      const context = { ...baseContext, tenantId: 'tenant123' };
      await expect(
        storageService.set('test-key', 'test-value', context),
      ).resolves.toBeUndefined();
    });

    it('should accept tenant ID with hyphens', async () => {
      const context = { ...baseContext, tenantId: 'tenant-123' };
      await expect(
        storageService.set('test-key', 'test-value', context),
      ).resolves.toBeUndefined();
    });

    it('should accept tenant ID with underscores', async () => {
      const context = { ...baseContext, tenantId: 'tenant_123' };
      await expect(
        storageService.set('test-key', 'test-value', context),
      ).resolves.toBeUndefined();
    });

    it('should accept tenant ID with dots', async () => {
      const context = { ...baseContext, tenantId: 'tenant.123' };
      await expect(
        storageService.set('test-key', 'test-value', context),
      ).resolves.toBeUndefined();
    });

    it('should accept tenant ID with mixed valid characters', async () => {
      const context = { ...baseContext, tenantId: 'tenant-123_abc.xyz' };
      await expect(
        storageService.set('test-key', 'test-value', context),
      ).resolves.toBeUndefined();
    });

    it('should accept maximum length tenant ID (128 characters)', async () => {
      const context = {
        ...baseContext,
        tenantId: 'a'.repeat(128),
      };
      await expect(
        storageService.set('test-key', 'test-value', context),
      ).resolves.toBeUndefined();
    });

    it('should accept single character tenant ID', async () => {
      const context = { ...baseContext, tenantId: 'a' };
      await expect(
        storageService.set('test-key', 'test-value', context),
      ).resolves.toBeUndefined();
    });

    it('should accept two character tenant ID', async () => {
      const context = { ...baseContext, tenantId: 'ab' };
      await expect(
        storageService.set('test-key', 'test-value', context),
      ).resolves.toBeUndefined();
    });

    it('should trim and accept tenant ID with whitespace', async () => {
      const context = { ...baseContext, tenantId: '  tenant123  ' };
      await expect(
        storageService.set('test-key', 'test-value', context),
      ).resolves.toBeUndefined();

      // Verify the trimmed value was used
      const result = await storageService.get<string>('test-key', {
        ...baseContext,
        tenantId: 'tenant123',
      });
      expect(result).toBe('test-value');
    });
  });

  describe('Invalid Tenant IDs - Missing or Empty', () => {
    it('should reject missing tenant ID', async () => {
      const context = { ...baseContext }; // No tenantId

      let thrown: Error | null = null;
      try {
        await storageService.set('test-key', 'test-value', context);
      } catch (error) {
        thrown = error as Error;
      }

      expect(thrown).toBeInstanceOf(McpError);
      const mcpError = thrown as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.InternalError);
      expect(mcpError.message).toContain('Tenant ID is required');
    });

    it('should reject empty string tenant ID', async () => {
      const context = { ...baseContext, tenantId: '' };

      let thrown: Error | null = null;
      try {
        await storageService.set('test-key', 'test-value', context);
      } catch (error) {
        thrown = error as Error;
      }

      expect(thrown).toBeInstanceOf(McpError);
      const mcpError = thrown as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.InvalidParams);
      expect(mcpError.message).toContain('cannot be an empty string');
    });

    it('should reject whitespace-only tenant ID', async () => {
      const context = { ...baseContext, tenantId: '   ' };

      let thrown: Error | null = null;
      try {
        await storageService.set('test-key', 'test-value', context);
      } catch (error) {
        thrown = error as Error;
      }

      expect(thrown).toBeInstanceOf(McpError);
      const mcpError = thrown as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.InvalidParams);
      expect(mcpError.message).toContain('cannot be an empty string');
    });
  });

  describe('Invalid Tenant IDs - Length Constraints', () => {
    it('should reject tenant ID exceeding 128 characters', async () => {
      const context = {
        ...baseContext,
        tenantId: 'a'.repeat(129),
      };

      let thrown: Error | null = null;
      try {
        await storageService.set('test-key', 'test-value', context);
      } catch (error) {
        thrown = error as Error;
      }

      expect(thrown).toBeInstanceOf(McpError);
      const mcpError = thrown as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.InvalidParams);
      expect(mcpError.message).toContain('exceeds maximum length');
    });
  });

  describe('Invalid Tenant IDs - Path Traversal Attacks', () => {
    it('should reject tenant ID with ../ path traversal', async () => {
      const context = { ...baseContext, tenantId: '../etc/passwd' };

      let thrown: Error | null = null;
      try {
        await storageService.set('test-key', 'test-value', context);
      } catch (error) {
        thrown = error as Error;
      }

      expect(thrown).toBeInstanceOf(McpError);
      const mcpError = thrown as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.InvalidParams);
      expect(mcpError.message).toMatch(/invalid characters|path traversal/i);
    });

    it('should reject tenant ID with ..\\ path traversal', async () => {
      const context = { ...baseContext, tenantId: '..\\windows\\system32' };

      let thrown: Error | null = null;
      try {
        await storageService.set('test-key', 'test-value', context);
      } catch (error) {
        thrown = error as Error;
      }

      expect(thrown).toBeInstanceOf(McpError);
      const mcpError = thrown as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.InvalidParams);
      expect(mcpError.message).toMatch(/invalid characters|path traversal/i);
    });

    it('should reject tenant ID with consecutive dots', async () => {
      const context = { ...baseContext, tenantId: 'tenant..id' };

      let thrown: Error | null = null;
      try {
        await storageService.set('test-key', 'test-value', context);
      } catch (error) {
        thrown = error as Error;
      }

      expect(thrown).toBeInstanceOf(McpError);
      const mcpError = thrown as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.InvalidParams);
      expect(mcpError.message).toContain('consecutive dots');
    });
  });

  describe('Invalid Tenant IDs - Special Characters', () => {
    it('should reject tenant ID with forward slash', async () => {
      const context = { ...baseContext, tenantId: 'tenant/123' };

      let thrown: Error | null = null;
      try {
        await storageService.set('test-key', 'test-value', context);
      } catch (error) {
        thrown = error as Error;
      }

      expect(thrown).toBeInstanceOf(McpError);
      const mcpError = thrown as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.InvalidParams);
      expect(mcpError.message).toContain('invalid characters');
    });

    it('should reject tenant ID with backslash', async () => {
      const context = { ...baseContext, tenantId: 'tenant\\123' };

      let thrown: Error | null = null;
      try {
        await storageService.set('test-key', 'test-value', context);
      } catch (error) {
        thrown = error as Error;
      }

      expect(thrown).toBeInstanceOf(McpError);
      const mcpError = thrown as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.InvalidParams);
      expect(mcpError.message).toContain('invalid characters');
    });

    it('should reject tenant ID with special characters (!@#$%)', async () => {
      const invalidChars = ['!', '@', '#', '$', '%'];
      for (const char of invalidChars) {
        const context = { ...baseContext, tenantId: `tenant${char}123` };

        let thrown: Error | null = null;
        try {
          await storageService.set('test-key', 'test-value', context);
        } catch (error) {
          thrown = error as Error;
        }

        expect(thrown).toBeInstanceOf(McpError);
        const mcpError = thrown as McpError;
        expect(mcpError.code).toBe(JsonRpcErrorCode.InvalidParams);
        expect(mcpError.message).toContain('invalid characters');
      }
    });

    it('should reject tenant ID starting with hyphen', async () => {
      const context = { ...baseContext, tenantId: '-tenant123' };

      let thrown: Error | null = null;
      try {
        await storageService.set('test-key', 'test-value', context);
      } catch (error) {
        thrown = error as Error;
      }

      expect(thrown).toBeInstanceOf(McpError);
      const mcpError = thrown as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.InvalidParams);
      expect(mcpError.message).toContain('invalid characters');
    });

    it('should reject tenant ID ending with dot', async () => {
      const context = { ...baseContext, tenantId: 'tenant123.' };

      let thrown: Error | null = null;
      try {
        await storageService.set('test-key', 'test-value', context);
      } catch (error) {
        thrown = error as Error;
      }

      expect(thrown).toBeInstanceOf(McpError);
      const mcpError = thrown as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.InvalidParams);
      expect(mcpError.message).toContain('invalid characters');
    });
  });

  describe('All Storage Operations', () => {
    it('should validate tenant ID in all methods', async () => {
      const invalidContext = {
        ...baseContext,
        tenantId: '../invalid',
      };

      // Test each method
      const methods = [
        () => storageService.get('key', invalidContext),
        () => storageService.set('key', 'value', invalidContext),
        () => storageService.delete('key', invalidContext),
        () => storageService.list('prefix', invalidContext),
        () => storageService.getMany(['key1'], invalidContext),
        () => storageService.setMany(new Map([['k', 'v']]), invalidContext),
        () => storageService.deleteMany(['key1'], invalidContext),
        () => storageService.clear(invalidContext),
      ];

      for (const method of methods) {
        let thrown: Error | null = null;
        try {
          await method();
        } catch (error) {
          thrown = error as Error;
        }

        expect(thrown).toBeInstanceOf(McpError);
        const mcpError = thrown as McpError;
        expect(mcpError.code).toBe(JsonRpcErrorCode.InvalidParams);
      }
    });
  });

  describe('Tenant Isolation', () => {
    it('should isolate data between tenants', async () => {
      const tenant1Context = {
        ...baseContext,
        tenantId: 'tenant1',
      };
      const tenant2Context = {
        ...baseContext,
        tenantId: 'tenant2',
      };

      // Set value for tenant1
      await storageService.set('shared-key', 'tenant1-value', tenant1Context);

      // Set value for tenant2
      await storageService.set('shared-key', 'tenant2-value', tenant2Context);

      // Verify isolation
      const tenant1Value = await storageService.get<string>(
        'shared-key',
        tenant1Context,
      );
      const tenant2Value = await storageService.get<string>(
        'shared-key',
        tenant2Context,
      );

      expect(tenant1Value).toBe('tenant1-value');
      expect(tenant2Value).toBe('tenant2-value');
    });
  });
});
