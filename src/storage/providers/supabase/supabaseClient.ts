/**
 * @fileoverview Initializes and exports a singleton Supabase client instance.
 * This module ensures that the Supabase client is initialized once and shared
 * across the application, using credentials from the central configuration.
 * It handles both the standard client and the admin client (using the service role key).
 *
 * @module src/storage/providers/supabase/supabaseClient
 */
import { SupabaseClient, createClient } from '@supabase/supabase-js';

import { config } from '../../../config/index.js';
import { JsonRpcErrorCode, McpError } from '../../../types-global/errors.js';
import { logger, requestContextService } from '../../../utils/index.js';
import { Database } from './supabase.types.js';

let supabase: SupabaseClient<Database> | null = null;
let supabaseAdmin: SupabaseClient<Database> | null = null;

const createSupabaseClient = (): SupabaseClient<Database> => {
  const context = requestContextService.createRequestContext({
    operation: 'createSupabaseClient',
  });

  if (!config.supabase?.url || !config.supabase?.anonKey) {
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      'Supabase URL or anon key is missing. Supabase client cannot be created.',
    );
  }

  logger.info('Creating new Supabase client instance.', context);
  return createClient<Database>(config.supabase.url, config.supabase.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const createSupabaseAdminClient = (): SupabaseClient<Database> => {
  const context = requestContextService.createRequestContext({
    operation: 'createSupabaseAdminClient',
  });

  if (!config.supabase?.url || !config.supabase?.serviceRoleKey) {
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      'Supabase URL or service role key is missing. Supabase admin client cannot be created.',
    );
  }

  logger.info('Creating new Supabase admin client instance.', context);
  return createClient<Database>(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
};

/**
 * Returns the singleton Supabase client instance.
 * Throws an McpError if the client is not initialized.
 * @returns The Supabase client.
 */
export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (!supabase) {
    supabase = createSupabaseClient();
  }
  return supabase;
};

/**
 * Returns the singleton Supabase admin client instance.
 * This client uses the service role key and bypasses RLS.
 * Throws an McpError if the admin client is not initialized.
 * @returns The Supabase admin client.
 */
export const getSupabaseAdminClient = (): SupabaseClient<Database> => {
  if (!supabaseAdmin) {
    supabaseAdmin = createSupabaseAdminClient();
  }
  return supabaseAdmin;
};
