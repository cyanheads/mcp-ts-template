/**
 * @fileoverview A Supabase-based storage provider.
 * Persists data to a specified table in a Supabase PostgreSQL database.
 * Assumes a table with columns: `key` (text), `value` (jsonb), and `expires_at` (timestamptz).
 * @module src/storage/providers/supabase/supabaseProvider
 */
import { ErrorHandler, type RequestContext, logger } from '@/utils/index.js';
import type {
  IStorageProvider,
  StorageOptions,
} from '@/storage/core/IStorageProvider.js';
import type { Json } from '@/storage/providers/supabase/supabase.types.js';
import { getSupabaseAdminClient } from '@/storage/providers/supabase/supabaseClient.js';

const TABLE_NAME = 'kv_store';

export class SupabaseProvider implements IStorageProvider {
  private getClient() {
    // Use the admin client to bypass RLS for this internal service
    return getSupabaseAdminClient();
  }

  async get<T>(key: string, context: RequestContext): Promise<T | null> {
    return ErrorHandler.tryCatch(
      async () => {
        const { data, error } = await this.getClient()
          .from(TABLE_NAME)
          .select('value, expires_at')
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
          await this.delete(key, context);
          logger.debug(
            `[SupabaseProvider] Key expired and removed: ${key}`,
            context,
          );
          return null;
        }

        return data.value as T;
      },
      { operation: 'SupabaseProvider.get', context, input: { key } },
    );
  }

  async set(
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
          .upsert({ key, value: value as Json, expires_at });

        if (error) throw error;
      },
      { operation: 'SupabaseProvider.set', context, input: { key } },
    );
  }

  async delete(key: string, context: RequestContext): Promise<boolean> {
    return ErrorHandler.tryCatch(
      async () => {
        const { error, count } = await this.getClient()
          .from(TABLE_NAME)
          .delete({ count: 'exact' })
          .eq('key', key);

        if (error) throw error;
        return (count ?? 0) > 0;
      },
      { operation: 'SupabaseProvider.delete', context, input: { key } },
    );
  }

  async list(prefix: string, context: RequestContext): Promise<string[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const now = new Date().toISOString();

        const { data, error } = await this.getClient()
          .from(TABLE_NAME)
          .select('key')
          .like('key', `${prefix}%`)
          // Add a filter to only include non-expired items.
          // It selects rows where expires_at is NULL OR expires_at is in the future.
          .or(`expires_at.is.null,expires_at.gt.${now}`);

        if (error) throw error;
        return data?.map((item) => item.key) ?? [];
      },
      { operation: 'SupabaseProvider.list', context, input: { prefix } },
    );
  }
}
