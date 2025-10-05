/**
 * @fileoverview Unit tests for the fetchWithTimeout utility.
 * @module tests/utils/network/fetchWithTimeout.test
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';

import {
  JsonRpcErrorCode,
  McpError,
} from '../../../src/types-global/errors.js';
import { fetchWithTimeout } from '../../../src/utils/network/fetchWithTimeout.js';
import { logger } from '../../../src/utils/internal/logger.js';

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
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(response as Response);

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

    await expect(
      fetchWithTimeout('https://example.com', 1000, context),
    ).rejects.toMatchObject({
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
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const abortError = new Error('Aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    });

    await expect(
      fetchWithTimeout('https://slow.example.com', 5, context),
    ).rejects.toMatchObject({
      code: JsonRpcErrorCode.Timeout,
      data: expect.objectContaining({ errorSource: 'FetchTimeout' }),
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'fetch GET https://slow.example.com timed out after 5ms.',
      expect.objectContaining({ errorSource: 'FetchTimeout' }),
    );
  });

  it('wraps unknown fetch errors into an McpError', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('connection reset'),
    );

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
    const existingError = new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      'upstream unavailable',
    );
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(existingError);

    await expect(
      fetchWithTimeout('https://error.example.com', 1000, context),
    ).rejects.toBe(existingError);

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
});
