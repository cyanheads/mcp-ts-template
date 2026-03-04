/**
 * @fileoverview Provides a utility function to make fetch requests with a specified timeout
 * and optional SSRF protection including DNS resolution validation and redirect following.
 * @module src/utils/network/fetchWithTimeout
 */
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';
import { runtimeCaps } from '@/utils/internal/runtime.js';

/**
 * Options for the fetchWithTimeout utility.
 * Extends standard RequestInit but omits 'signal' as it's handled internally.
 */
export interface FetchWithTimeoutOptions extends Omit<RequestInit, 'signal'> {
  /**
   * When true, rejects requests to private/reserved IP ranges and localhost.
   * Use this when fetching user-controlled URLs to prevent SSRF attacks
   * against internal services (e.g., cloud metadata endpoints, internal APIs).
   *
   * On Node.js, also resolves DNS and validates all A/AAAA records against
   * private ranges. On Workers, only string-based checks apply (no DNS API).
   *
   * When enabled, redirects are followed manually with SSRF validation on each hop.
   *
   * Default: false (no restriction).
   */
  rejectPrivateIPs?: boolean;
  /**
   * Optional external AbortSignal (e.g., from sdkContext.signal) to combine
   * with the internal timeout signal. If the external signal aborts, the
   * fetch is cancelled immediately.
   */
  signal?: AbortSignal;
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

/** IPv6 prefixes for private/reserved ranges (checked against DNS-resolved addresses). */
const PRIVATE_IPV6_PREFIXES = [
  'fe80:', // Link-local
  'fc', // Unique local (fc00::/7)
  'fd', // Unique local (fc00::/7)
  '::1', // Loopback
  '::ffff:127.', // IPv4-mapped loopback
  '::ffff:10.', // IPv4-mapped RFC 1918
  '::ffff:192.168.', // IPv4-mapped RFC 1918
  '::ffff:172.16.', // IPv4-mapped RFC 1918 (partial)
  '::ffff:169.254.', // IPv4-mapped link-local
];

const PRIVATE_HOSTNAMES = new Set(['localhost', 'metadata.google.internal', 'metadata.internal']);

/** Maximum number of redirects to follow when rejectPrivateIPs is enabled. */
const MAX_SSRF_REDIRECTS = 5;

/**
 * Checks whether a resolved IP address falls within private/reserved ranges.
 */
function isPrivateIP(ip: string): boolean {
  if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip))) return true;
  const lower = ip.toLowerCase();
  if (PRIVATE_IPV6_PREFIXES.some((prefix) => lower.startsWith(prefix))) return true;
  return false;
}

/**
 * Validates that a URL does not target private/reserved IP space.
 * On Node.js, also resolves DNS and checks all resolved IPs.
 * @throws {McpError} If the hostname resolves to a private IP or is a known internal hostname.
 */
async function assertNotPrivateUrl(urlString: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new McpError(JsonRpcErrorCode.ValidationError, `Invalid URL: ${urlString}`);
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

  // Check IPv4 private ranges (hostname as literal IP)
  if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname))) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      `Request to private/reserved IP blocked: ${hostname}`,
    );
  }

  // DNS resolution check (Node.js only — Workers have no DNS API)
  if (runtimeCaps.isNode) {
    await assertDnsNotPrivate(hostname);
  }
}

/**
 * Resolves DNS for a hostname and validates that no resolved IP is private.
 * Swallows DNS resolution failures (ENOTFOUND etc.) — let fetch handle those.
 */
async function assertDnsNotPrivate(hostname: string): Promise<void> {
  try {
    const dns = await import('node:dns/promises');

    const [ipv4Results, ipv6Results] = await Promise.allSettled([
      dns.resolve4(hostname),
      dns.resolve6(hostname),
    ]);

    const resolvedIPs: string[] = [
      ...(ipv4Results.status === 'fulfilled' ? ipv4Results.value : []),
      ...(ipv6Results.status === 'fulfilled' ? ipv6Results.value : []),
    ];

    for (const ip of resolvedIPs) {
      if (isPrivateIP(ip)) {
        throw new McpError(
          JsonRpcErrorCode.ValidationError,
          `DNS resolved ${hostname} to private IP ${ip} — SSRF blocked`,
        );
      }
    }
  } catch (error) {
    if (error instanceof McpError) throw error;
    // DNS resolution failures (ENOTFOUND, etc.) are not SSRF — let fetch handle them
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
    await assertNotPrivateUrl(urlString);
  }

  const operationDescription = `fetch ${options?.method || 'GET'} ${urlString}`;

  logger.debug(`Attempting ${operationDescription} with ${timeoutMs}ms timeout.`, context);

  // Strip custom options before passing to native fetch
  const { rejectPrivateIPs: rejectPrivate, signal: externalSignal, ...fetchInit } = options ?? {};

  // When SSRF protection is active, handle redirects manually to validate each hop
  if (rejectPrivate) {
    fetchInit.redirect = 'manual';
  }

  // Use AbortController instead of AbortSignal.timeout() for cross-runtime compatibility
  // (AbortSignal.timeout() can fail in Bun's stdio transport due to realm mismatch)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // If an external signal is provided (e.g., client disconnect), forward its abort
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), {
        once: true,
        signal: controller.signal,
      });
    }
  }

  try {
    let currentUrl: string | URL = url;
    let redirectCount = 0;

    for (;;) {
      const response = await fetch(currentUrl, {
        ...fetchInit,
        signal: controller.signal,
      });

      // Handle redirects manually when SSRF protection is active
      if (rejectPrivate && response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new McpError(
            JsonRpcErrorCode.ServiceUnavailable,
            `Redirect response missing Location header from ${String(currentUrl)}`,
          );
        }

        redirectCount++;
        if (redirectCount > MAX_SSRF_REDIRECTS) {
          throw new McpError(
            JsonRpcErrorCode.ValidationError,
            `Too many redirects (${MAX_SSRF_REDIRECTS}) — possible SSRF redirect loop`,
          );
        }

        // Resolve relative redirect URLs against the current URL
        const redirectUrl = new URL(location, currentUrl.toString()).toString();

        // Validate the redirect target against SSRF rules
        await assertNotPrivateUrl(redirectUrl);

        logger.debug(`Following validated redirect ${redirectCount}: ${redirectUrl}`, context);
        currentUrl = redirectUrl;
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Could not read response body');
        logger.error(`Fetch failed for ${String(currentUrl)} with status ${response.status}.`, {
          ...context,
          statusCode: response.status,
          statusText: response.statusText,
          responseBody: errorBody,
          errorSource: 'FetchHttpError',
        });
        throw new McpError(
          JsonRpcErrorCode.ServiceUnavailable,
          `Fetch failed for ${String(currentUrl)}. Status: ${response.status}`,
          {
            requestId: context.requestId,
            operation: context.operation as string | undefined,
            statusCode: response.status,
            statusText: response.statusText,
            responseBody: errorBody,
          },
        );
      }

      logger.debug(
        `Successfully fetched ${String(currentUrl)}. Status: ${response.status}`,
        context,
      );
      return response;
    }
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      logger.error(`${operationDescription} timed out after ${timeoutMs}ms.`, {
        ...context,
        errorSource: 'FetchTimeout',
      });
      throw new McpError(JsonRpcErrorCode.Timeout, `${operationDescription} timed out.`, {
        requestId: context.requestId,
        operation: context.operation as string | undefined,
        errorSource: 'FetchTimeout',
      });
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Network error during ${operationDescription}: ${errorMessage}`, {
      ...context,
      originalErrorName: error instanceof Error ? error.name : 'UnknownError',
      errorSource: 'FetchNetworkError',
    });

    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      `Network error during ${operationDescription}: ${errorMessage}`,
      {
        requestId: context.requestId,
        operation: context.operation as string | undefined,
        originalErrorName: error instanceof Error ? error.name : 'UnknownError',
        errorSource: 'FetchNetworkErrorWrapper',
      },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
