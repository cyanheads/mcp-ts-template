/**
 * @fileoverview Unit tests for the fetchWithTimeout utility.
 * @module tests/utils/network/fetchWithTimeout.test
 */
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { JsonRpcErrorCode, McpError } from '../../../src/types-global/errors.js';
import { logger } from '../../../src/utils/internal/logger.js';
import { fetchWithTimeout } from '../../../src/utils/network/fetchWithTimeout.js';

describe('fetchWithTimeout', () => {
  const context = {
    requestId: 'ctx-1',
    timestamp: new Date().toISOString(),
  };
  let debugSpy: MockInstance;
  let errorSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves with the response when fetch succeeds', async () => {
    const response = new Response('ok', { status: 200 });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response as Response);

    const result = await fetchWithTimeout('https://example.com', 1000, context);

    expect(result).toBe(response);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(debugSpy).toHaveBeenCalledWith(
      'Successfully fetched https://example.com. Status: 200',
      context,
    );
  });

  it('throws an McpError when the response is not ok', async () => {
    const response = new Response('nope', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response as Response);

    await expect(fetchWithTimeout('https://example.com', 1000, context)).rejects.toMatchObject({
      code: JsonRpcErrorCode.ServiceUnavailable,
      message: expect.stringContaining('Status: 503'),
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'Fetch failed for https://example.com with status 503.',
      expect.objectContaining({
        errorSource: 'FetchHttpError',
        statusCode: 503,
      }),
    );
  });

  it('throws a timeout McpError when the request exceeds the allotted time', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }),
    );

    await expect(fetchWithTimeout('https://slow.example.com', 5, context)).rejects.toMatchObject({
      code: JsonRpcErrorCode.Timeout,
      data: expect.objectContaining({ errorSource: 'FetchTimeout' }),
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'fetch GET https://slow.example.com timed out after 5ms.',
      expect.objectContaining({ errorSource: 'FetchTimeout' }),
    );
  });

  it('wraps unknown fetch errors into an McpError', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('connection reset'));

    await expect(
      fetchWithTimeout('https://error.example.com', 1000, context),
    ).rejects.toMatchObject({
      code: JsonRpcErrorCode.ServiceUnavailable,
      data: expect.objectContaining({
        errorSource: 'FetchNetworkErrorWrapper',
        originalErrorName: 'Error',
      }),
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'Network error during fetch GET https://error.example.com: connection reset',
      expect.objectContaining({
        errorSource: 'FetchNetworkError',
        originalErrorName: 'Error',
      }),
    );
  });

  it('rethrows an existing McpError without wrapping it again', async () => {
    const existingError = new McpError(JsonRpcErrorCode.ServiceUnavailable, 'upstream unavailable');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(existingError);

    await expect(fetchWithTimeout('https://error.example.com', 1000, context)).rejects.toBe(
      existingError,
    );

    expect(errorSpy).toHaveBeenCalledWith(
      'Network error during fetch GET https://error.example.com: upstream unavailable',
      expect.objectContaining({
        errorSource: 'FetchNetworkError',
        originalErrorName: 'McpError',
      }),
    );
  });

  it('falls back to placeholder response body when response.text() fails', async () => {
    const failingResponse = {
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      text: vi.fn().mockRejectedValue(new Error('stream closed')),
    } as unknown as Response;

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(failingResponse);

    await expect(
      fetchWithTimeout('https://bad-body.example.com', 1000, context),
    ).rejects.toMatchObject({
      code: JsonRpcErrorCode.ServiceUnavailable,
      data: expect.objectContaining({
        responseBody: 'Could not read response body',
        statusCode: 502,
      }),
    });

    expect(failingResponse.text).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Fetch failed for https://bad-body.example.com with status 502.',
      expect.objectContaining({
        responseBody: 'Could not read response body',
        errorSource: 'FetchHttpError',
      }),
    );
  });

  it('wraps non-Error rejection values into McpError instances', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue('catastrophic failure');

    await expect(
      fetchWithTimeout('https://string-error.example.com', 500, context),
    ).rejects.toMatchObject({
      code: JsonRpcErrorCode.ServiceUnavailable,
      message: expect.stringContaining('catastrophic failure'),
      data: expect.objectContaining({
        originalErrorName: 'UnknownError',
        errorSource: 'FetchNetworkErrorWrapper',
      }),
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'Network error during fetch GET https://string-error.example.com: catastrophic failure',
      expect.objectContaining({
        originalErrorName: 'UnknownError',
        errorSource: 'FetchNetworkError',
      }),
    );
  });

  describe('SSRF protection', () => {
    describe('hostname/IP pattern checks', () => {
      const ssrfOpts = { rejectPrivateIPs: true };

      it('should reject localhost', async () => {
        await expect(
          fetchWithTimeout('http://localhost/secrets', 1000, context, ssrfOpts),
        ).rejects.toMatchObject({
          code: JsonRpcErrorCode.ValidationError,
          message: expect.stringContaining('private/internal hostname'),
        });
      });

      it('should reject 127.x.x.x', async () => {
        await expect(
          fetchWithTimeout('http://127.0.0.1/metadata', 1000, context, ssrfOpts),
        ).rejects.toMatchObject({ code: JsonRpcErrorCode.ValidationError });
      });

      it('should reject 10.x.x.x', async () => {
        await expect(
          fetchWithTimeout('http://10.0.0.1/internal', 1000, context, ssrfOpts),
        ).rejects.toMatchObject({ code: JsonRpcErrorCode.ValidationError });
      });

      it('should reject 192.168.x.x', async () => {
        await expect(
          fetchWithTimeout('http://192.168.1.1/admin', 1000, context, ssrfOpts),
        ).rejects.toMatchObject({ code: JsonRpcErrorCode.ValidationError });
      });

      it('should reject 169.254.169.254 (cloud metadata)', async () => {
        await expect(
          fetchWithTimeout('http://169.254.169.254/latest/meta-data/', 1000, context, ssrfOpts),
        ).rejects.toMatchObject({ code: JsonRpcErrorCode.ValidationError });
      });

      it('should reject metadata.google.internal', async () => {
        await expect(
          fetchWithTimeout(
            'http://metadata.google.internal/computeMetadata/v1/',
            1000,
            context,
            ssrfOpts,
          ),
        ).rejects.toMatchObject({ code: JsonRpcErrorCode.ValidationError });
      });

      it('should reject IPv6 loopback ::1', async () => {
        await expect(
          fetchWithTimeout('http://[::1]/secrets', 1000, context, ssrfOpts),
        ).rejects.toMatchObject({ code: JsonRpcErrorCode.ValidationError });
      });

      it('should reject IPv6 loopback full form', async () => {
        await expect(
          fetchWithTimeout('http://[0:0:0:0:0:0:0:1]/secrets', 1000, context, ssrfOpts),
        ).rejects.toMatchObject({ code: JsonRpcErrorCode.ValidationError });
      });

      it('should reject 172.16-31.x.x', async () => {
        await expect(
          fetchWithTimeout('http://172.16.0.1/', 1000, context, ssrfOpts),
        ).rejects.toMatchObject({ code: JsonRpcErrorCode.ValidationError });
        await expect(
          fetchWithTimeout('http://172.31.255.255/', 1000, context, ssrfOpts),
        ).rejects.toMatchObject({ code: JsonRpcErrorCode.ValidationError });
      });

      it('should reject RFC 6598 CGNAT range', async () => {
        await expect(
          fetchWithTimeout('http://100.64.0.1/', 1000, context, ssrfOpts),
        ).rejects.toMatchObject({ code: JsonRpcErrorCode.ValidationError });
      });

      it('should allow public IPs when SSRF protection is enabled', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));
        // 8.8.8.8 is a public IP — string check passes, DNS resolution skipped for literal IPs
        const result = await fetchWithTimeout('https://8.8.8.8', 1000, context, ssrfOpts);
        expect(result.status).toBe(200);
      });
    });

    describe('redirect validation', () => {
      it('should reject redirect to private IP', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response(null, {
            status: 302,
            headers: { location: 'http://169.254.169.254/metadata' },
          }),
        );

        await expect(
          fetchWithTimeout('https://public.example.com', 1000, context, {
            rejectPrivateIPs: true,
          }),
        ).rejects.toMatchObject({
          code: JsonRpcErrorCode.ValidationError,
        });
      });

      it('should reject redirect to localhost', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response(null, {
            status: 301,
            headers: { location: 'http://localhost/admin' },
          }),
        );

        await expect(
          fetchWithTimeout('https://public.example.com', 1000, context, {
            rejectPrivateIPs: true,
          }),
        ).rejects.toMatchObject({
          code: JsonRpcErrorCode.ValidationError,
          message: expect.stringContaining('private/internal hostname'),
        });
      });

      it('should reject excessive redirects', async () => {
        // Every fetch returns a redirect to a public URL
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
          new Response(null, {
            status: 302,
            headers: { location: 'https://example.com/loop' },
          }),
        );

        await expect(
          fetchWithTimeout('https://loop.example.com', 1000, context, {
            rejectPrivateIPs: true,
          }),
        ).rejects.toMatchObject({
          code: JsonRpcErrorCode.ValidationError,
          message: expect.stringContaining('Too many redirects'),
        });
      });

      it('should follow safe redirects', async () => {
        const fetchMock = vi
          .spyOn(globalThis, 'fetch')
          .mockResolvedValueOnce(
            new Response(null, {
              status: 301,
              headers: { location: 'https://new.example.com/page' },
            }),
          )
          .mockResolvedValueOnce(new Response('ok', { status: 200 }));

        const result = await fetchWithTimeout('https://old.example.com', 1000, context, {
          rejectPrivateIPs: true,
        });
        expect(result.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it('should reject redirect missing Location header', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 302 }));

        await expect(
          fetchWithTimeout('https://public.example.com', 1000, context, {
            rejectPrivateIPs: true,
          }),
        ).rejects.toMatchObject({
          code: JsonRpcErrorCode.ServiceUnavailable,
          message: expect.stringContaining('missing Location header'),
        });
      });

      it('should not use manual redirect mode when SSRF protection is disabled', async () => {
        const fetchMock = vi
          .spyOn(globalThis, 'fetch')
          .mockResolvedValue(new Response('ok', { status: 200 }));

        await fetchWithTimeout('https://example.com', 1000, context);

        expect(fetchMock).toHaveBeenCalledWith(
          'https://example.com',
          expect.not.objectContaining({ redirect: 'manual' }),
        );
      });

      it('should use manual redirect mode when SSRF protection is enabled', async () => {
        const fetchMock = vi
          .spyOn(globalThis, 'fetch')
          .mockResolvedValue(new Response('ok', { status: 200 }));

        await fetchWithTimeout('https://8.8.8.8', 1000, context, { rejectPrivateIPs: true });

        expect(fetchMock).toHaveBeenCalledWith(
          'https://8.8.8.8',
          expect.objectContaining({ redirect: 'manual' }),
        );
      });
    });
  });
});
