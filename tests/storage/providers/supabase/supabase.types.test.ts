/**
 * @fileoverview Type-satisfaction tests for Supabase database type definitions.
 * Verifies that the Database and Json types are well-formed and usable
 * as type constraints at runtime.
 * @module tests/storage/providers/supabase/supabase.types.test
 */

import { describe, expect, it } from 'vitest';
import type { Database, Json } from '@/storage/providers/supabase/supabase.types.js';

describe('Supabase Types', () => {
  it('should satisfy Json type with primitive values', () => {
    const str: Json = 'hello';
    const num: Json = 42;
    const bool: Json = true;
    const nil: Json = null;

    expect(str).toBe('hello');
    expect(num).toBe(42);
    expect(bool).toBe(true);
    expect(nil).toBeNull();
  });

  it('should satisfy Json type with nested structures', () => {
    const obj: Json = { key: 'value', nested: { count: 1 } };
    const arr: Json = [1, 'two', { three: true }];

    expect(obj).toBeDefined();
    expect(arr).toBeDefined();
  });

  it('should satisfy Database.public.Tables.kv_store.Row', () => {
    const row: Database['public']['Tables']['kv_store']['Row'] = {
      key: 'test-key',
      value: { data: 'test' },
      expires_at: null,
      tenant_id: 'tenant-1',
    };

    expect(row.key).toBe('test-key');
    expect(row.tenant_id).toBe('tenant-1');
    expect(row.expires_at).toBeNull();
  });

  it('should satisfy Database.public.Tables.kv_store.Insert', () => {
    const insert: Database['public']['Tables']['kv_store']['Insert'] = {
      key: 'new-key',
      value: 'new-value',
      tenant_id: 'tenant-1',
    };

    expect(insert.key).toBe('new-key');
    // expires_at is optional on Insert
    expect(insert.expires_at).toBeUndefined();
  });

  it('should satisfy Database.public.Tables.kv_store.Update with partial fields', () => {
    const update: Database['public']['Tables']['kv_store']['Update'] = {
      value: 'updated',
    };

    expect(update.value).toBe('updated');
    // All fields are optional on Update
    expect(update.key).toBeUndefined();
  });
});
