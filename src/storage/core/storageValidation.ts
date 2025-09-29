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
const MAX_TENANT_ID_LENGTH = 256;
const MAX_KEY_LENGTH = 1024;
const MAX_PREFIX_LENGTH = 512;

/**
 * Pattern for valid tenant IDs and keys (alphanumeric, hyphens, underscores, dots, slashes).
 */
const VALID_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_.\-/]+$/;

/**
 * Validates a tenant ID for storage operations.
 * @param tenantId The tenant ID to validate.
 * @param context The request context for error reporting.
 * @throws {McpError} If the tenant ID is invalid.
 */
export function validateTenantId(
  tenantId: string,
  context: RequestContext,
): void {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      'Tenant ID must be a non-empty string.',
      { ...context, tenantId },
    );
  }

  if (tenantId.length > MAX_TENANT_ID_LENGTH) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      `Tenant ID exceeds maximum length of ${MAX_TENANT_ID_LENGTH} characters.`,
      { ...context, tenantId: tenantId.substring(0, 50) + '...' },
    );
  }

  if (!VALID_IDENTIFIER_PATTERN.test(tenantId)) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      'Tenant ID contains invalid characters. Only alphanumeric, hyphens, underscores, dots, and slashes are allowed.',
      { ...context, tenantId },
    );
  }

  if (tenantId.includes('..')) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      'Tenant ID must not contain ".." (path traversal attempt).',
      { ...context, tenantId },
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

  if (!VALID_IDENTIFIER_PATTERN.test(key)) {
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
        'TTL must be a non-negative number.',
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
