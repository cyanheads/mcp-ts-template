/**
 * @fileoverview Test suite for Supabase storage provider
 * @module tests/storage/providers/supabase/supabaseProvider.test
 */

import { describe, test } from 'vitest';

describe('Supabase Storage Provider', () => {
  test.skip('Requires a live Supabase connection — not runnable in unit tests', () => {
    // SupabaseProvider contains real implementation logic (CRUD against a Supabase
    // PostgreSQL backend). Testing it requires either a live Supabase instance or
    // a full mock of the Supabase client, which belongs in integration tests.
  });
});
