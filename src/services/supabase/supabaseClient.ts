/**
 * @fileoverview Initializes and exports a singleton Supabase client instance.
 * This module ensures that the Supabase client is initialized once and shared
 * across the application, using credentials from the central configuration.
 * It handles both the standard client and the admin client (using the service role key).
 *
 * @module src/services/supabase/supabaseClient
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../../config/index.js";
import { BaseErrorCode, McpError } from "../../types-global/errors.js";
import { logger, requestContextService } from "../../utils/index.js";

// Define a type for our database schema if we have one.
// For now, we'll use `Record<string, unknown>` but this should be replaced with generated types.
type Database = Record<string, unknown>;

let supabase: SupabaseClient<Database> | null = null;
let supabaseAdmin: SupabaseClient<Database> | null = null;

const initializeSupabase = () => {
  const context = requestContextService.createRequestContext({
    operation: "initializeSupabase",
  });

  if (config.supabase?.url && config.supabase?.anonKey) {
    if (!supabase) {
      supabase = createClient<Database>(
        config.supabase.url,
        config.supabase.anonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );
      logger.info("Supabase client initialized.", context);
    }

    if (!supabaseAdmin && config.supabase.serviceRoleKey) {
      supabaseAdmin = createClient<Database>(
        config.supabase.url,
        config.supabase.serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );
      logger.info("Supabase admin client initialized.", context);
    }
  } else {
    logger.warning(
      "Supabase URL or anon key is missing. Supabase clients not initialized.",
      context,
    );
  }
};

// Initialize on load
initializeSupabase();

/**
 * Returns the singleton Supabase client instance.
 * Throws an McpError if the client is not initialized.
 * @returns The Supabase client.
 */
export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (!supabase) {
    throw new McpError(
      BaseErrorCode.SERVICE_NOT_INITIALIZED,
      "Supabase client has not been initialized. Please check your SUPABASE_URL and SUPABASE_ANON_KEY environment variables.",
    );
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
    throw new McpError(
      BaseErrorCode.SERVICE_NOT_INITIALIZED,
      "Supabase admin client has not been initialized. Please check your SUPABASE_SERVICE_ROLE_KEY environment variable.",
    );
  }
  return supabaseAdmin;
};
