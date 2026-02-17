/**
 * @fileoverview Provides a utility function to make fetch requests with a specified timeout
 * and optional SSRF protection.
 * @module src/utils/network/fetchWithTimeout
 */
// Adjusted import path
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';
// Adjusted import path
import type { RequestContext } from '@/utils/internal/requestContext.js';

/**
 * Options for the fetchWithTimeout utility.
 * Extends standard RequestInit but omits 'signal' as it's handled internally.
 */
export interface FetchWithTimeoutOptions extends Omit<RequestInit, 'signal'> {
  /**
   * When true, rejects requests to private/reserved IP ranges and localhost.
   * Use this when fetching user-controlled URLs to prevent SSRF attacks
   * against internal services (e.g., cloud metadata endpoints, internal APIs).
   * Default: false (no restriction).
   */
  rejectPrivateIPs?: boolean;
}

/**
 * IPv4 patterns for private/reserved ranges that should be blocked when
 * `rejectPrivateIPs` is enabled. Covers RFC 1918, loopback, link-local,
 * and cloud metadata endpoints.
 */
const PRIVATE_IP_PATTERNS = [
  /^127\./, // Loopback
  /^10\./, // RFC 1918 Class A
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC 1918 Class B
  /^192\.168\./, // RFC 1918 Class C
  /^169\.254\./, // Link-local / cloud metadata
  /^0\./, // Current network
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // RFC 6598 (CGNAT)
];

const PRIVATE_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.internal',
]);

/**
 * Validates that a URL does not target private/reserved IP space.
 * @throws {McpError} If the hostname resolves to a private IP or is a known internal hostname.
 */
function assertNotPrivateUrl(urlString: string): void {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      `Invalid URL: ${urlString}`,
    );
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, ''); // Strip IPv6 brackets

  // Check known private hostnames
  if (PRIVATE_HOSTNAMES.has(hostname.toLowerCase())) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      `Request to private/internal hostname blocked: ${hostname}`,
    );
  }

  // Check IPv6 loopback
  if (hostname === '::1' || hostname === '0:0:0:0:0:0:0:1') {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      `Request to loopback address blocked: ${hostname}`,
    );
  }

  // Check IPv4 private ranges
  if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname))) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      `Request to private/reserved IP blocked: ${hostname}`,
    );
  }
}

/**
 * Fetches a resource with a specified timeout and optional SSRF protection.
 *
 * @param url - The URL to fetch.
 * @param timeoutMs - The timeout duration in milliseconds.
 * @param context - The request context for logging.
 * @param options - Optional fetch options (RequestInit), excluding 'signal'.
 *   Set `rejectPrivateIPs: true` when fetching user-controlled URLs.
 * @returns A promise that resolves to the Response object.
 * @throws {McpError} If the request times out, targets a private IP (when enabled),
 *   or another fetch-related error occurs.
 */
export async function fetchWithTimeout(
  url: string | URL,
  timeoutMs: number,
  context: RequestContext,
  options?: FetchWithTimeoutOptions,
): Promise<Response> {
  const urlString = url.toString();

  // SSRF protection: reject private/internal targets when enabled
  if (options?.rejectPrivateIPs) {
    assertNotPrivateUrl(urlString);
  }

  const operationDescription = `fetch ${options?.method || 'GET'} ${urlString}`;

  logger.debug(
    `Attempting ${operationDescription} with ${timeoutMs}ms timeout.`,
    context,
  );

  // Strip custom options before passing to native fetch
  const { rejectPrivateIPs: _, ...fetchInit } = options ?? {};

  try {
    const response = await fetch(url, {
      ...fetchInit,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => 'Could not read response body');
      logger.error(
        `Fetch failed for ${urlString} with status ${response.status}.`,
        {
          ...context,
          statusCode: response.status,
          statusText: response.statusText,
          responseBody: errorBody,
          errorSource: 'FetchHttpError',
        },
      );
      throw new McpError(
        JsonRpcErrorCode.ServiceUnavailable,
        `Fetch failed for ${urlString}. Status: ${response.status}`,
        {
          ...context,
          statusCode: response.status,
          statusText: response.statusText,
          responseBody: errorBody,
        },
      );
    }

    logger.debug(
      `Successfully fetched ${urlString}. Status: ${response.status}`,
      context,
    );
    return response;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError')
    ) {
      logger.error(`${operationDescription} timed out after ${timeoutMs}ms.`, {
        ...context,
        errorSource: 'FetchTimeout',
      });
      throw new McpError(
        JsonRpcErrorCode.Timeout,
        `${operationDescription} timed out.`,
        { ...context, errorSource: 'FetchTimeout' },
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `Network error during ${operationDescription}: ${errorMessage}`,
      {
        ...context,
        originalErrorName: error instanceof Error ? error.name : 'UnknownError',
        errorSource: 'FetchNetworkError',
      },
    );

    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      `Network error during ${operationDescription}: ${errorMessage}`,
      {
        ...context,
        originalErrorName: error instanceof Error ? error.name : 'UnknownError',
        errorSource: 'FetchNetworkErrorWrapper',
      },
    );
  }
}
