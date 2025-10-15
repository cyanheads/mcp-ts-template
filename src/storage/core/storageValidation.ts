/**
 * @fileoverview Input validation utilities for storage operations.
 * Ensures consistent validation across all storage providers.
 * @module src/storage/core/storageValidation
 */
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import type { RequestContext } from '@/utils/index.js';
import type { StorageOptions } from './IStorageProvider.js';

/**
 * Maximum length for tenant IDs and keys to prevent abuse.
 */
const MAX_TENANT_ID_LENGTH = 128;
const MAX_KEY_LENGTH = 1024;
const MAX_PREFIX_LENGTH = 512;

/**
 * Pattern for valid tenant IDs (alphanumeric, hyphens, underscores, dots).
 * More restrictive than key pattern - no slashes allowed to prevent path traversal.
 * Single character: must be alphanumeric.
 * Multiple characters: must start and end with alphanumeric, middle can include ._-
 */
const VALID_TENANT_ID_PATTERN =
  /^[a-zA-Z0-9]$|^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/;

/**
 * Pattern for valid keys and prefixes (alphanumeric, hyphens, underscores, dots, slashes).
 */
const VALID_KEY_PATTERN = /^[a-zA-Z0-9_.\-/]+$/;

/**
 * Validates a tenant ID for storage operations.
 *
 * Security constraints:
 * - Must be non-empty string
 * - Maximum length: 128 characters
 * - Allowed characters: alphanumeric, hyphens, underscores, dots
 * - Cannot contain slashes or path traversal sequences
 * - Cannot start or end with special characters
 *
 * @param tenantId The tenant ID to validate.
 * @param context The request context for error reporting.
 * @throws {McpError} If the tenant ID is invalid.
 */
export function validateTenantId(
  tenantId: string,
  context: RequestContext,
): void {
  if (typeof tenantId !== 'string') {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Tenant ID must be a string.',
      { ...context, tenantId },
    );
  }

  const trimmedTenantId = tenantId.trim();

  if (trimmedTenantId.length === 0) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Tenant ID cannot be an empty string.',
      { ...context, tenantId },
    );
  }

  if (trimmedTenantId.length > MAX_TENANT_ID_LENGTH) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `Tenant ID exceeds maximum length of ${MAX_TENANT_ID_LENGTH} characters.`,
      { ...context, tenantIdLength: trimmedTenantId.length },
    );
  }

  if (!VALID_TENANT_ID_PATTERN.test(trimmedTenantId)) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Tenant ID contains invalid characters. Only alphanumeric characters, hyphens, underscores, and dots are allowed. Must start and end with alphanumeric characters.',
      { ...context, tenantId: trimmedTenantId },
    );
  }

  if (trimmedTenantId.includes('..')) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Tenant ID contains consecutive dots, which are not allowed.',
      { ...context, tenantId: trimmedTenantId },
    );
  }

  if (trimmedTenantId.includes('../') || trimmedTenantId.includes('..\\')) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Tenant ID contains path traversal sequences, which are not allowed.',
      { ...context, tenantId: trimmedTenantId },
    );
  }
}

/**
 * Validates a storage key.
 * @param key The key to validate.
 * @param context The request context for error reporting.
 * @throws {McpError} If the key is invalid.
 */
export function validateKey(key: string, context: RequestContext): void {
  if (!key || typeof key !== 'string') {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      'Key must be a non-empty string.',
      { ...context, key },
    );
  }

  if (key.length > MAX_KEY_LENGTH) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      `Key exceeds maximum length of ${MAX_KEY_LENGTH} characters.`,
      { ...context, key: key.substring(0, 50) + '...' },
    );
  }

  if (!VALID_KEY_PATTERN.test(key)) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      'Key contains invalid characters. Only alphanumeric, hyphens, underscores, dots, and slashes are allowed.',
      { ...context, key },
    );
  }

  if (key.includes('..')) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      'Key must not contain ".." (path traversal attempt).',
      { ...context, key },
    );
  }
}

/**
 * Validates a prefix for list operations.
 * @param prefix The prefix to validate.
 * @param context The request context for error reporting.
 * @throws {McpError} If the prefix is invalid.
 */
export function validatePrefix(prefix: string, context: RequestContext): void {
  if (typeof prefix !== 'string') {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      'Prefix must be a string.',
      { ...context, prefix },
    );
  }

  if (prefix.length > MAX_PREFIX_LENGTH) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      `Prefix exceeds maximum length of ${MAX_PREFIX_LENGTH} characters.`,
      { ...context, prefix: prefix.substring(0, 50) + '...' },
    );
  }

  if (prefix.includes('..')) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      'Prefix must not contain ".." (path traversal attempt).',
      { ...context, prefix },
    );
  }
}

/**
 * Validates storage options.
 * @param options The storage options to validate.
 * @param context The request context for error reporting.
 * @throws {McpError} If the options are invalid.
 */
export function validateStorageOptions(
  options: StorageOptions | undefined,
  context: RequestContext,
): void {
  if (!options) {
    return;
  }

  if (options.ttl !== undefined) {
    if (typeof options.ttl !== 'number') {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'TTL must be a number (seconds).',
        { ...context, ttl: options.ttl },
      );
    }

    if (options.ttl < 0) {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'TTL must be a non-negative number. Use 0 for immediate expiration.',
        { ...context, ttl: options.ttl },
      );
    }

    if (!Number.isFinite(options.ttl)) {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'TTL must be a finite number.',
        { ...context, ttl: options.ttl },
      );
    }
  }
}

/**
 * Cursor encoding/decoding utilities for pagination.
 * Cursors are opaque strings that should not be constructed or parsed by clients.
 */

interface CursorData {
  /** The last key from the previous page */
  k: string;
  /** The tenant ID for validation */
  t: string;
}

/**
 * Encodes pagination cursor data into an opaque string.
 * @param lastKey The last key from the current page.
 * @param tenantId The tenant ID for validation.
 * @returns An opaque cursor string.
 */
export function encodeCursor(lastKey: string, tenantId: string): string {
  const data: CursorData = { k: lastKey, t: tenantId };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Decodes and validates an opaque cursor string.
 * @param cursor The cursor string to decode.
 * @param tenantId The expected tenant ID for validation.
 * @param context The request context for error reporting.
 * @returns The last key from the cursor.
 * @throws {McpError} If the cursor is invalid or tampered with.
 */
export function decodeCursor(
  cursor: string,
  tenantId: string,
  context: RequestContext,
): string {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const data = JSON.parse(decoded) as CursorData;

    if (!data || typeof data !== 'object' || !('k' in data) || !('t' in data)) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        'Invalid cursor format.',
        { ...context },
      );
    }

    if (data.t !== tenantId) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        'Cursor tenant ID mismatch. Cursor may have been tampered with.',
        { ...context },
      );
    }

    return data.k;
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Failed to decode cursor. Cursor may be corrupted or invalid.',
      { ...context, error },
    );
  }
}
