/**
 * @fileoverview Tests for the template-image-test tool.
 * @module tests/mcp-server/tools/definitions/template-image-test.tool.test
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { imageTestTool } from '../../../../src/mcp-server/tools/definitions/template-image-test.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import {
  JsonRpcErrorCode,
  McpError,
} from '../../../../src/types-global/errors.js';

// Create a fake image buffer (e.g., a simple 1x1 GIF)
const fakeImageBuffer = Buffer.from(
  'R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=',
  'base64',
);

const server = setupServer(
  http.get('https://cataas.com/cat', () => {
    return new HttpResponse(fakeImageBuffer.buffer, {
      headers: { 'Content-Type': 'image/gif' },
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('imageTestTool', () => {
  const mockSdkContext = {
    signal: new AbortController().signal,
    requestId: 'test-request-id',
    sendNotification: vi.fn(),
    sendRequest: vi.fn(),
  };

  it.skip('should fetch an image and return it as base64', async () => {
    const context = requestContextService.createRequestContext();
    const result = await imageTestTool.logic(
      { trigger: true },
      context,
      mockSdkContext,
    );

    expect(result.mimeType).toBe('image/gif');
    // The actual image data should match our fake GIF
    const expected = fakeImageBuffer.toString('base64');
    expect(result.data).toBe(expected);
  });

  it('should throw an McpError when the image API responds with non-OK status', async () => {
    server.use(
      http.get('https://cataas.com/cat', () =>
        HttpResponse.text('nope', { status: 502 }),
      ),
    );

    const context = requestContextService.createRequestContext();
    const promise = imageTestTool.logic(
      { trigger: true },
      context,
      mockSdkContext,
    );

    await expect(promise).rejects.toBeInstanceOf(McpError);
    await expect(promise).rejects.toHaveProperty(
      'code',
      JsonRpcErrorCode.ServiceUnavailable,
    );

    try {
      await imageTestTool.logic({ trigger: true }, context, mockSdkContext);
    } catch (error) {
      const mcpError = error as McpError;
      // fetchWithTimeout throws the McpError, which is what we expect
      expect(mcpError.message).toContain('Fetch failed');
      expect(mcpError.message).toContain('502');
    }
  });

  it('should handle error when response.text() fails during error handling', async () => {
    server.use(
      http.get('https://cataas.com/cat', () => {
        return new HttpResponse(null, {
          status: 500,
          statusText: 'Internal Server Error',
        });
      }),
    );

    const context = requestContextService.createRequestContext();
    const promise = imageTestTool.logic(
      { trigger: true },
      context,
      mockSdkContext,
    );

    await expect(promise).rejects.toBeInstanceOf(McpError);
    await expect(promise).rejects.toHaveProperty(
      'code',
      JsonRpcErrorCode.ServiceUnavailable,
    );
  });

  it('should throw an McpError when the image payload is empty', async () => {
    server.use(
      http.get(
        'https://cataas.com/cat',
        () =>
          new HttpResponse(new ArrayBuffer(0), {
            headers: { 'Content-Type': 'image/png' },
          }),
      ),
    );

    const context = requestContextService.createRequestContext();
    const promise = imageTestTool.logic(
      { trigger: true },
      context,
      mockSdkContext,
    );

    await expect(promise).rejects.toBeInstanceOf(McpError);
    await expect(promise).rejects.toHaveProperty(
      'code',
      JsonRpcErrorCode.ServiceUnavailable,
    );
  });

  it('should format image responses into an image content block', () => {
    const formatter = imageTestTool.responseFormatter;
    expect(formatter).toBeDefined();

    const blocks = formatter!({
      data: fakeImageBuffer.toString('base64'),
      mimeType: 'image/gif',
    });

    expect(blocks).toEqual([
      {
        type: 'image',
        data: fakeImageBuffer.toString('base64'),
        mimeType: 'image/gif',
      },
    ]);
  });

  it('should default mime type when response header is missing', async () => {
    server.use(
      http.get('https://cataas.com/cat', () => {
        return new HttpResponse(fakeImageBuffer.buffer);
      }),
    );

    const context = requestContextService.createRequestContext();
    const result = await imageTestTool.logic(
      { trigger: true },
      context,
      mockSdkContext,
    );

    expect(result.mimeType).toBe('image/jpeg');
  });
});
