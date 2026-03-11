/**
 * @fileoverview Tests for the template-image-test tool (new-style API).
 * @module tests/mcp-server/tools/definitions/template-image-test.tool.test
 */

import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createMockContext } from '@/testing/index.js';
import { imageTestTool } from '../../../../src/mcp-server/tools/definitions/template-image-test.tool.js';
import { JsonRpcErrorCode, McpError } from '../../../../src/types-global/errors.js';

// Create a fake image buffer (e.g., a simple 1x1 GIF)
const fakeImageBuffer = Buffer.from('R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=', 'base64');

const server = setupServer(
  http.get(
    'https://cataas.com/cat',
    () =>
      new HttpResponse(fakeImageBuffer.buffer, {
        headers: { 'Content-Type': 'image/gif' },
      }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('imageTestTool', () => {
  it.skip('should fetch an image and return it as base64', async () => {
    const ctx = createMockContext();
    const input = imageTestTool.input.parse({ trigger: true });
    const result = await imageTestTool.handler(input, ctx);

    expect(result.mimeType).toBe('image/gif');
    const expected = fakeImageBuffer.toString('base64');
    expect(result.data).toBe(expected);
  });

  it('should throw an McpError when the image API responds with non-OK status', async () => {
    server.use(
      http.get('https://cataas.com/cat', () => HttpResponse.text('nope', { status: 502 })),
    );

    const ctx = createMockContext();
    const input = imageTestTool.input.parse({ trigger: true });

    await expect(imageTestTool.handler(input, ctx)).rejects.toBeInstanceOf(McpError);

    try {
      await imageTestTool.handler(input, ctx);
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError.message).toContain('Fetch failed');
      expect(mcpError.message).toContain('502');
    }
  });

  it('should handle error when response.text() fails during error handling', async () => {
    server.use(
      http.get(
        'https://cataas.com/cat',
        () => new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' }),
      ),
    );

    const ctx = createMockContext();
    const input = imageTestTool.input.parse({ trigger: true });
    const promise = imageTestTool.handler(input, ctx);

    await expect(promise).rejects.toBeInstanceOf(McpError);
    await expect(promise).rejects.toHaveProperty('code', JsonRpcErrorCode.ServiceUnavailable);
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

    const ctx = createMockContext();
    const input = imageTestTool.input.parse({ trigger: true });
    const promise = imageTestTool.handler(input, ctx);

    await expect(promise).rejects.toBeInstanceOf(McpError);
    await expect(promise).rejects.toHaveProperty('code', JsonRpcErrorCode.ServiceUnavailable);
  });

  it('should format image responses into an image content block', () => {
    const blocks = imageTestTool.format?.({
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
    server.use(http.get('https://cataas.com/cat', () => new HttpResponse(fakeImageBuffer.buffer)));

    const ctx = createMockContext();
    const input = imageTestTool.input.parse({ trigger: true });
    const result = await imageTestTool.handler(input, ctx);

    expect(result.mimeType).toBe('image/jpeg');
  });
});
