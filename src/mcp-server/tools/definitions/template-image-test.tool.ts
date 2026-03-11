/**
 * @fileoverview Template image test tool — demonstrates binary response handling.
 * Fetches a random cat image and returns it base64-encoded with the MIME type.
 * @module src/mcp-server/tools/definitions/template-image-test.tool
 */

import { z } from 'zod';

import { tool } from '@/mcp-server/tools/utils/newToolDefinition.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { arrayBufferToBase64 } from '@/utils/internal/encoding.js';
import { fetchWithTimeout } from '@/utils/network/fetchWithTimeout.js';

const CAT_API_URL = 'https://cataas.com/cat';
const API_TIMEOUT_MS = 5000;

const InputSchema = z.object({
  trigger: z
    .boolean()
    .optional()
    .default(true)
    .describe('A trigger to invoke the tool and fetch a new cat image.'),
});

const OutputSchema = z.object({
  data: z.string().describe('Base64 encoded image data.'),
  mimeType: z.string().describe("The MIME type of the image (e.g., 'image/jpeg')."),
});

export const imageTestTool = tool('template_image_test', {
  title: 'Template Image Test',
  description:
    'Fetches a random cat image and returns it base64-encoded with the MIME type. Useful for testing image handling.',
  input: InputSchema,
  output: OutputSchema,
  auth: ['tool:image_test:read'],
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },

  async handler(input, ctx) {
    ctx.log.debug('Processing template_image_test', { toolInput: input });

    const reqCtx = { requestId: ctx.requestId, timestamp: ctx.timestamp };
    const response = await fetchWithTimeout(CAT_API_URL, API_TIMEOUT_MS, reqCtx, {
      signal: ctx.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => undefined);
      throw new McpError(
        JsonRpcErrorCode.ServiceUnavailable,
        `Image API request failed: ${response.status} ${response.statusText}`,
        { requestId: ctx.requestId, httpStatusCode: response.status, responseBody: errorText },
      );
    }

    const arrayBuf = await response.arrayBuffer();
    if (arrayBuf.byteLength === 0) {
      throw new McpError(
        JsonRpcErrorCode.ServiceUnavailable,
        'Image API returned an empty payload.',
        {
          requestId: ctx.requestId,
        },
      );
    }

    const mimeType = response.headers.get('content-type') || 'image/jpeg';

    ctx.log.notice('Image fetched and encoded successfully.', {
      mimeType,
      byteLength: arrayBuf.byteLength,
    });

    return { data: arrayBufferToBase64(arrayBuf), mimeType };
  },

  format(result) {
    return [{ type: 'image', data: result.data, mimeType: result.mimeType }];
  },
});
