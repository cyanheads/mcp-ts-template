/**
 * @fileoverview Tests for the template-image-test tool.
 * @module tests/mcp-server/tools/definitions/template-image-test.tool.test
 */
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { imageTestTool } from '../../../../src/mcp-server/tools/definitions/template-image-test.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';

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
  it('should fetch an image and return it as base64', async () => {
    const context = requestContextService.createRequestContext();
    const result = await imageTestTool.logic({ trigger: true }, context);

    expect(result.mimeType).toBe('image/gif');
    expect(result.data).toBe(fakeImageBuffer.toString('base64'));
  });
});
