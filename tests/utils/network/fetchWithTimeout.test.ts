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

import { JsonRpcErrorCode } from '../../../src/types-global/errors.js';
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
});
