/**
 * @fileoverview Unit and compliance tests for the SurrealKvProvider implementation.
 * @module tests/storage/providers/surrealdb/surrealKvProvider.test
 */
import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';
import Surreal from 'surrealdb';

import { SurrealKvProvider } from '@/storage/providers/surrealdb/kv/surrealKvProvider.js';
import { requestContextService } from '@/utils/index.js';

import { storageProviderTests } from '../../storageProviderCompliance.test.js';

// Mock the Surreal client
vi.mock('surrealdb', () => {
  return {
    default: vi.fn(),
  };
});

const createTestContext = () =>
  requestContextService.createRequestContext({
    operation: 'surrealdb-provider-test',
  });

/**
 * Creates a mock SurrealDB client that stores data in memory.
 * This allows us to test the provider without a real database connection.
 */
function createMockSurrealClient() {
  const store = new Map<string, unknown>();

  const mockQuery: Mock = vi.fn(async (query: string, params?: unknown) => {
    const paramsObj = params as Record<string, unknown>;

    // Extract tenant_id and key from params (could be direct or where_0/where_1 format)
    const tenantId = (paramsObj?.tenant_id || paramsObj?.where_0) as string;
    const key = (paramsObj?.key || paramsObj?.where_1) as string;

    // Handle transaction control statements
    if (
      query.includes('BEGIN TRANSACTION') ||
      query.includes('COMMIT TRANSACTION') ||
      query.includes('CANCEL TRANSACTION')
    ) {
      return [{ result: [] }];
    }

    // Simulate SELECT queries
    if (query.includes('SELECT')) {
      if (query.includes('key INSIDE')) {
        // getMany operation
        const keys = paramsObj?.keys as string[];
        const records = keys
          .map((k) => {
            const storeKey = `${tenantId}:${k}`;
            const record = store.get(storeKey) as
              | {
                  value: unknown;
                  expires_at?: string | null;
                  created_at?: string;
                }
              | undefined;
            if (record) {
              return {
                key: k,
                value: record.value,
                expires_at: record.expires_at,
                created_at: record.created_at,
              };
            }
            return null;
          })
          .filter(Boolean);
        return [{ result: records }];
      } else if (query.includes('string::starts_with')) {
        // list operation
        const prefix = paramsObj?.prefix as string;
        const cursor = paramsObj?.cursor as string | undefined;
        const results: Array<{ key: string }> = [];

        for (const [storeKey, _value] of store.entries()) {
          const [tid, ...keyParts] = storeKey.split(':');
          const actualKey = keyParts.join(':');
          if (tid === tenantId && actualKey.startsWith(prefix)) {
            results.push({ key: actualKey });
          }
        }

        // Sort for consistent pagination
        results.sort((a, b) => a.key.localeCompare(b.key));

        // Apply cursor-based pagination
        let filteredResults = results;
        if (cursor && query.includes('key > $cursor')) {
          filteredResults = results.filter((r) => r.key > cursor);
        }

        return [{ result: filteredResults }];
      } else {
        // get operation
        const storeKey = `${tenantId}:${key}`;
        const record = store.get(storeKey) as
          | { value: unknown; expires_at?: string | null; created_at?: string }
          | undefined;
        if (record) {
          // Filter out expired records (simulates SurrealDB WHERE clause behavior)
          if (
            record.expires_at &&
            new Date(record.expires_at).getTime() < Date.now()
          ) {
            return [{ result: [] }]; // Expired, return empty
          }
          return [{ result: [record] }];
        }
        return [{ result: [] }];
      }
    }

    // Simulate UPDATE queries (set operation)
    if (query.includes('UPDATE')) {
      // Check if it's a batch operation (setMany) by looking for multiple UPDATE statements
      const statements = query
        .split(';')
        .filter((s) => s.trim() && s.includes('UPDATE'));

      if (statements.length > 1) {
        // Multiple UPDATE statements - batch operation
        for (let i = 0; i < statements.length; i++) {
          const keyParam = `key_${i}`;
          const valueParam = `value_${i}`;
          const keyVal = paramsObj?.[keyParam] as string;
          const valueVal = paramsObj?.[valueParam];
          const expiresAt = paramsObj?.expires_at as string | null;

          if (keyVal) {
            const storeKey = `${tenantId}:${keyVal}`;
            const existing = store.get(storeKey) as
              | {
                  value: unknown;
                  expires_at?: string | null;
                  created_at?: string;
                }
              | undefined;
            // Preserve created_at if it exists (simulates MERGE behavior)
            store.set(storeKey, {
              value: valueVal,
              expires_at: expiresAt,
              created_at: existing?.created_at ?? new Date().toISOString(),
            });
          }
        }
        return [{ result: [] }];
      } else {
        // Single UPDATE statement
        const value = paramsObj?.value;
        const expiresAt = paramsObj?.expires_at as string | null;
        const storeKey = `${tenantId}:${key}`;
        const existing = store.get(storeKey) as
          | { value: unknown; expires_at?: string | null; created_at?: string }
          | undefined;
        // Preserve created_at if it exists (simulates MERGE behavior)
        const created_at = existing?.created_at ?? new Date().toISOString();
        store.set(storeKey, { value, expires_at: expiresAt, created_at });
        return [
          { result: [{ key, value, expires_at: expiresAt, created_at }] },
        ];
      }
    }

    // Simulate DELETE queries
    if (query.includes('DELETE')) {
      if (query.includes('key INSIDE')) {
        // deleteMany operation
        const keys = paramsObj?.keys as string[];
        const deleted = keys
          .map((k) => {
            const storeKey = `${tenantId}:${k}`;
            if (store.has(storeKey)) {
              store.delete(storeKey);
              return { key: k };
            }
            return null;
          })
          .filter(Boolean);
        return [{ result: deleted }];
      } else if (key) {
        // delete operation
        const storeKey = `${tenantId}:${key}`;
        if (store.has(storeKey)) {
          const record = store.get(storeKey);
          store.delete(storeKey);
          return [{ result: [record] }];
        }
        return [{ result: [] }];
      } else {
        // clear operation
        const deleted: unknown[] = [];
        for (const [storeKey, record] of store.entries()) {
          const [tid] = storeKey.split(':');
          if (tid === tenantId) {
            deleted.push(record);
            store.delete(storeKey);
          }
        }
        return [{ result: deleted }];
      }
    }

    return [{ result: [] }];
  });

  return {
    query: mockQuery,
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as Surreal;
}

describe('SurrealKvProvider (unit)', () => {
  let provider: SurrealKvProvider;
  let mockClient: Surreal;
  const tenantId = 'tenant-a';

  beforeEach(() => {
    mockClient = createMockSurrealClient();
    provider = new SurrealKvProvider(mockClient, 'kv_store');
  });

  it('evicts entries that have passed their ttl', async () => {
    const context = createTestContext();
    const pastDate = new Date(Date.now() - 2000).toISOString();

    // Manually set an expired entry
    await mockClient.query(
      'UPDATE type::table($table):[$tenant_id, $key] CONTENT { tenant_id: $tenant_id, key: $key, value: $value, expires_at: $expires_at }',
      {
        table: 'kv_store',
        tenant_id: tenantId,
        key: 'expired',
        value: 'old-value',
        expires_at: pastDate,
      },
    );

    // Try to get the expired entry
    const result = await provider.get(tenantId, 'expired', context);
    expect(result).toBeNull();
  });

  it('handles ttl=0 for immediate expiration', async () => {
    const context = createTestContext();
    const key = 'immediate-expire';

    // Set with ttl=0 (immediate expiration - expires_at = Date.now())
    await provider.set(tenantId, key, 'should-expire-immediately', context, {
      ttl: 0,
    });

    // Wait 1ms to ensure we're past the expiration time
    await new Promise((resolve) => setTimeout(resolve, 1));

    // Should be expired now
    const result = await provider.get(tenantId, key, context);
    expect(result).toBeNull();
  });

  it('preserves created_at timestamp on updates', async () => {
    const context = createTestContext();
    const key = 'timestamp-test';

    // First set
    await provider.set(tenantId, key, 'initial-value', context);

    // Get the record directly from mock to verify created_at
    const firstQuery = await mockClient.query<
      [{ result: Array<{ created_at: string }> }]
    >(
      'SELECT created_at FROM type::table($table) WHERE tenant_id = $tenant_id AND key = $key',
      {
        table: 'kv_store',
        tenant_id: tenantId,
        key,
      },
    );
    const firstCreatedAt = firstQuery[0]?.result[0]?.created_at;
    expect(firstCreatedAt).toBeDefined();

    // Wait a tiny bit to ensure timestamps would differ
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Update the value
    await provider.set(tenantId, key, 'updated-value', context);

    // Get the record again
    const secondQuery = await mockClient.query<
      [{ result: Array<{ created_at: string }> }]
    >(
      'SELECT created_at FROM type::table($table) WHERE tenant_id = $tenant_id AND key = $key',
      {
        table: 'kv_store',
        tenant_id: tenantId,
        key,
      },
    );
    const secondCreatedAt = secondQuery[0]?.result[0]?.created_at;

    // created_at should be preserved (same as first)
    expect(secondCreatedAt).toBe(firstCreatedAt);

    // But the value should be updated
    const value = await provider.get<string>(tenantId, key, context);
    expect(value).toBe('updated-value');
  });

  it('isolates data between tenants', async () => {
    const context = createTestContext();
    await provider.set('tenant-a', 'shared-key', 'value-a', context);
    await provider.set('tenant-b', 'shared-key', 'value-b', context);

    const tenantAValue = await provider.get('tenant-a', 'shared-key', context);
    const tenantBValue = await provider.get('tenant-b', 'shared-key', context);

    expect(tenantAValue).toBe('value-a');
    expect(tenantBValue).toBe('value-b');
  });

  it('handles batch operations correctly', async () => {
    const context = createTestContext();
    const entries = new Map<string, unknown>([
      ['batch:1', 'value1'],
      ['batch:2', 'value2'],
      ['batch:3', 'value3'],
    ]);

    await provider.setMany(tenantId, entries, context);

    const keys = ['batch:1', 'batch:2', 'batch:3'];
    const results = await provider.getMany<string>(tenantId, keys, context);

    expect(results.size).toBe(3);
    expect(results.get('batch:1')).toBe('value1');
    expect(results.get('batch:2')).toBe('value2');
    expect(results.get('batch:3')).toBe('value3');
  });

  it('supports prefix-based listing', async () => {
    const context = createTestContext();
    await provider.set(tenantId, 'prefix:alpha', 'a', context);
    await provider.set(tenantId, 'prefix:beta', 'b', context);
    await provider.set(tenantId, 'other:gamma', 'c', context);

    const result = await provider.list(tenantId, 'prefix:', context);

    expect(result.keys).toContain('prefix:alpha');
    expect(result.keys).toContain('prefix:beta');
    expect(result.keys).not.toContain('other:gamma');
  });

  it('returns correct count after deleteMany', async () => {
    const context = createTestContext();
    await provider.set(tenantId, 'delete:1', 'val1', context);
    await provider.set(tenantId, 'delete:2', 'val2', context);
    await provider.set(tenantId, 'delete:3', 'val3', context);

    const deletedCount = await provider.deleteMany(
      tenantId,
      ['delete:1', 'delete:2', 'delete:999'],
      context,
    );

    expect(deletedCount).toBe(2);
  });

  it('clears all tenant data', async () => {
    const context = createTestContext();
    await provider.set(tenantId, 'key1', 'value1', context);
    await provider.set(tenantId, 'key2', 'value2', context);
    await provider.set('other-tenant', 'key3', 'value3', context);

    const clearedCount = await provider.clear(tenantId, context);

    expect(clearedCount).toBe(2);

    // Verify tenant data is cleared
    const result1 = await provider.get(tenantId, 'key1', context);
    const result2 = await provider.get(tenantId, 'key2', context);
    expect(result1).toBeNull();
    expect(result2).toBeNull();

    // Verify other tenant data is preserved
    const otherTenantValue = await provider.get(
      'other-tenant',
      'key3',
      context,
    );
    expect(otherTenantValue).toBe('value3');
  });
});

// Run the generic compliance suite to ensure contract compatibility
storageProviderTests(
  () => new SurrealKvProvider(createMockSurrealClient(), 'kv_store'),
  'SurrealKvProvider',
);
