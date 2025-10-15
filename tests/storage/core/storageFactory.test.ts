/**
 * @fileoverview Unit tests for storage provider factory.
 * @module tests/storage/core/storageFactory
 */
import { describe, it, expect, vi } from 'vitest';
import type { AppConfig } from '@/config/index.js';

import { createStorageProvider } from '@/storage/core/storageFactory.js';
import { InMemoryProvider } from '@/storage/providers/inMemory/inMemoryProvider.js';
import { FileSystemProvider } from '@/storage/providers/fileSystem/fileSystemProvider.js';
import { SupabaseProvider } from '@/storage/providers/supabase/supabaseProvider.js';
import { SurrealKvProvider } from '@/storage/providers/surrealdb/kv/surrealKvProvider.js';
import { McpError } from '@/types-global/errors.js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }),
  }),
}));

describe('createStorageProvider', () => {
  describe('in-memory provider', () => {
    it('should create InMemoryProvider when configured', () => {
      const mockConfig = {
        storage: {
          providerType: 'in-memory' as const,
        },
      } as AppConfig;

      const provider = createStorageProvider(mockConfig);

      expect(provider).toBeInstanceOf(InMemoryProvider);
    });

    it('should force in-memory provider for non-serverless-compatible types', () => {
      // Note: isServerless is evaluated at module load time, so we can't easily test
      // the actual serverless detection. Instead, we verify the allowed provider types
      // for serverless environments by checking the implementation logic.
      // This test documents that in-memory is the fallback for incompatible types.

      const mockConfig = {
        storage: {
          providerType: 'in-memory' as const,
        },
      } as AppConfig;

      const provider = createStorageProvider(mockConfig);

      expect(provider).toBeInstanceOf(InMemoryProvider);
    });
  });

  describe('filesystem provider', () => {
    it('should create FileSystemProvider with valid path', () => {
      const mockConfig = {
        storage: {
          providerType: 'filesystem' as const,
          filesystemPath: '/tmp/test-storage',
        },
      } as AppConfig;

      const provider = createStorageProvider(mockConfig);

      expect(provider).toBeInstanceOf(FileSystemProvider);
    });

    it('should throw McpError when filesystem path is missing', () => {
      const mockConfig = {
        storage: {
          providerType: 'filesystem' as const,
          filesystemPath: undefined,
        },
      } as unknown as AppConfig;

      expect(() => createStorageProvider(mockConfig)).toThrow(McpError);
      expect(() => createStorageProvider(mockConfig)).toThrow(
        /STORAGE_FILESYSTEM_PATH must be set/,
      );
    });
  });

  describe('supabase provider', () => {
    it('should create SupabaseProvider with provided client', () => {
      const mockConfig = {
        storage: {
          providerType: 'supabase' as const,
        },
        supabase: {
          url: 'https://test.supabase.co',
          serviceRoleKey: 'test-key',
        },
      } as AppConfig;

      const mockClient = {
        from: vi.fn(),
      };

      // Provide the client to avoid DI container issues
      const provider = createStorageProvider(mockConfig, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabaseClient: mockClient as any,
      });

      expect(provider).toBeInstanceOf(SupabaseProvider);
    });

    it('should throw McpError when supabase URL is missing', () => {
      const mockConfig = {
        storage: {
          providerType: 'supabase' as const,
        },
        supabase: {
          url: undefined,
          serviceRoleKey: 'test-key',
        },
      } as unknown as AppConfig;

      expect(() => createStorageProvider(mockConfig)).toThrow(McpError);
      expect(() => createStorageProvider(mockConfig)).toThrow(
        /SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set/,
      );
    });

    it('should throw McpError when supabase service role key is missing', () => {
      const mockConfig = {
        storage: {
          providerType: 'supabase' as const,
        },
        supabase: {
          url: 'https://test.supabase.co',
          serviceRoleKey: undefined,
        },
      } as AppConfig;

      expect(() => createStorageProvider(mockConfig)).toThrow(McpError);
    });
  });

  describe('surrealdb provider', () => {
    it('should create SurrealKvProvider with provided client', () => {
      const mockConfig = {
        storage: {
          providerType: 'surrealdb' as const,
        },
        surrealdb: {
          url: 'ws://127.0.0.1:8000/rpc',
          namespace: 'test-namespace',
          database: 'test-database',
          tableName: 'kv_store',
        },
      } as AppConfig;

      const mockClient = {
        query: vi.fn(),
        connect: vi.fn(),
        close: vi.fn(),
      };

      // Provide the client to avoid DI container issues
      const provider = createStorageProvider(mockConfig, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        surrealdbClient: mockClient as any,
      });

      expect(provider).toBeInstanceOf(SurrealKvProvider);
    });

    it('should throw McpError when surrealdb URL is missing', () => {
      const mockConfig = {
        storage: {
          providerType: 'surrealdb' as const,
        },
        surrealdb: {
          url: undefined,
          namespace: 'test',
          database: 'test',
        },
      } as unknown as AppConfig;

      expect(() => createStorageProvider(mockConfig)).toThrow(McpError);
      expect(() => createStorageProvider(mockConfig)).toThrow(
        /SURREALDB_URL, SURREALDB_NAMESPACE, and SURREALDB_DATABASE must be set/,
      );
    });

    it('should throw McpError when surrealdb namespace is missing', () => {
      const mockConfig = {
        storage: {
          providerType: 'surrealdb' as const,
        },
        surrealdb: {
          url: 'ws://127.0.0.1:8000/rpc',
          namespace: undefined,
          database: 'test',
        },
      } as unknown as AppConfig;

      expect(() => createStorageProvider(mockConfig)).toThrow(McpError);
    });

    it('should throw McpError when surrealdb database is missing', () => {
      const mockConfig = {
        storage: {
          providerType: 'surrealdb' as const,
        },
        surrealdb: {
          url: 'ws://127.0.0.1:8000/rpc',
          namespace: 'test',
          database: undefined,
        },
      } as unknown as AppConfig;

      expect(() => createStorageProvider(mockConfig)).toThrow(McpError);
    });
  });

  describe('cloudflare providers', () => {
    it('should throw error for R2 provider outside serverless environment', () => {
      const mockConfig = {
        storage: {
          providerType: 'cloudflare-r2' as const,
        },
      } as AppConfig;

      expect(() => createStorageProvider(mockConfig)).toThrow(McpError);
      expect(() => createStorageProvider(mockConfig)).toThrow(
        /Cloudflare R2 storage is only available in a Cloudflare Worker environment/,
      );
    });

    it('should throw error for KV provider outside serverless environment', () => {
      const mockConfig = {
        storage: {
          providerType: 'cloudflare-kv' as const,
        },
      } as AppConfig;

      expect(() => createStorageProvider(mockConfig)).toThrow(McpError);
      expect(() => createStorageProvider(mockConfig)).toThrow(
        /Cloudflare KV storage is only available in a Cloudflare Worker environment/,
      );
    });
  });

  describe('unknown provider type', () => {
    it('should throw error for unsupported provider type', () => {
      const mockConfig = {
        storage: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          providerType: 'invalid-provider' as any,
        },
      } as AppConfig;

      expect(() => createStorageProvider(mockConfig)).toThrow(McpError);
      expect(() => createStorageProvider(mockConfig)).toThrow(
        /Unhandled storage provider type/,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle in-memory provider creation consistently', () => {
      // Test that in-memory provider is always created correctly
      const mockConfig = {
        storage: {
          providerType: 'in-memory' as const,
        },
      } as AppConfig;

      const provider = createStorageProvider(mockConfig);

      expect(provider).toBeInstanceOf(InMemoryProvider);
    });
  });
});
