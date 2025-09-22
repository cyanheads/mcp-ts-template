/**
 * @fileoverview A Supabase-based storage provider.
 * Persists data to a specified table in a Supabase PostgreSQL database.
 * Assumes a table with columns: `key` (text), `value` (jsonb), and `expires_at` (timestamptz).
 * @module src/storage/providers/supabase/supabaseProvider
 */
import { inject, injectable } from 'tsyringe';

import { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseAdminClient } from '@/container/tokens.js';
import type {
  IStorageProvider,
  StorageOptions,
} from '@/storage/core/IStorageProvider.js';
import type {
  Json,
  Database,
} from '@/storage/providers/supabase/supabase.types.js';
import { ErrorHandler, type RequestContext, logger } from '@/utils/index.js';

const TABLE_NAME = 'kv_store';

@injectable()
export class SupabaseProvider implements IStorageProvider {
  constructor(
    @inject(SupabaseAdminClient)
    private readonly client: SupabaseClient<Database>,
  ) {}

  private getClient() {
    return this.client;
  }

  async get<T>(
    tenantId: string,
    key: string,
    context: RequestContext,
  ): Promise<T | null> {
    return ErrorHandler.tryCatch(
      async () => {
        const { data, error } = await this.getClient()
          .from(TABLE_NAME)
          .select('value, expires_at')
          .eq('tenant_id', tenantId)
          .eq('key', key)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // "Not found" error code from PostgREST
            return null;
          }
          throw error;
        }

        if (
          data.expires_at &&
          new Date(data.expires_at).getTime() < Date.now()
        ) {
          await this.delete(tenantId, key, context);
          logger.debug(
            `[SupabaseProvider] Key expired and removed: ${key} for tenant: ${tenantId}`,
            context,
          );
          return null;
        }

        return data.value as T;
      },
      {
        operation: 'SupabaseProvider.get',
        context,
        input: { tenantId, key },
      },
    );
  }

  async set(
    tenantId: string,
    key: string,
    value: unknown,
    context: RequestContext,
    options?: StorageOptions,
  ): Promise<void> {
    return ErrorHandler.tryCatch(
      async () => {
        const expires_at = options?.ttl
          ? new Date(Date.now() + options.ttl * 1000).toISOString()
          : null;

        const { error } = await this.getClient()
          .from(TABLE_NAME)
          .upsert({
            tenant_id: tenantId,
            key,
            value: value as Json,
            expires_at,
          });

        if (error) throw error;
      },
      {
        operation: 'SupabaseProvider.set',
        context,
        input: { tenantId, key },
      },
    );
  }

  async delete(
    tenantId: string,
    key: string,
    context: RequestContext,
  ): Promise<boolean> {
    return ErrorHandler.tryCatch(
      async () => {
        const { error, count } = await this.getClient()
          .from(TABLE_NAME)
          .delete({ count: 'exact' })
          .eq('tenant_id', tenantId)
          .eq('key', key);

        if (error) throw error;
        return (count ?? 0) > 0;
      },
      {
        operation: 'SupabaseProvider.delete',
        context,
        input: { tenantId, key },
      },
    );
  }

  async list(
    tenantId: string,
    prefix: string,
    context: RequestContext,
  ): Promise<string[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const now = new Date().toISOString();

        const { data, error } = await this.getClient()
          .from(TABLE_NAME)
          .select('key')
          .eq('tenant_id', tenantId)
          .like('key', `${prefix}%`)
          // Add a filter to only include non-expired items.
          // It selects rows where expires_at is NULL OR expires_at is in the future.
          .or(`expires_at.is.null,expires_at.gt.${now}`);

        if (error) throw error;
        return data?.map((item) => item.key) ?? [];
      },
      {
        operation: 'SupabaseProvider.list',
        context,
        input: { tenantId, prefix },
      },
    );
  }
}
