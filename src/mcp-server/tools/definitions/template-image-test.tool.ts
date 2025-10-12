/**
 * @fileoverview Complete, declarative definition for the 'template_image_test' tool.
 * Fetches a random image and returns it as base64 with a correct MIME type.
 * Mirrors the updated style used by the template echo and cat fact tools.
 * @module src/mcp-server/tools/definitions/template-image-test.tool
 */
import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type {
  SdkContext,
  ToolAnnotations,
  ToolDefinition,
} from '@/mcp-server/tools/utils/index.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import {
  type RequestContext,
  fetchWithTimeout,
  logger,
} from '@/utils/index.js';
import { arrayBufferToBase64 } from '@/utils/internal/encoding.js';

/**
 * Programmatic tool name (must be unique).
 * Naming convention (recommended): <server-prefix>_<action>_<object>
 * - Use a short, stable server prefix for discoverability across servers.
 * - Use lowercase snake_case.
 * - Examples: 'template_echo_message', 'template_cat_fact'.
 */
const TOOL_NAME = 'template_image_test';
/** --------------------------------------------------------- */

/** Human-readable title used by UIs. */
const TOOL_TITLE = 'Template Image Test';
/** --------------------------------------------------------- */

/**
 * LLM-facing description of the tool.
 * Guidance:
 * - Be descriptive but concise (aim for 1–2 sentences).
 * - Write from the LLM's perspective to optimize tool selection.
 * - State purpose, primary inputs, notable constraints, and side effects.
 * - Mention any requirements (auth, permissions, online access) and limits
 *   (rate limits, size constraints, expected latency) if critically applicable.
 * - Note determinism/idempotency and external-world interactions when relevant.
 * - Avoid implementation details; focus on the observable behavior and contract.
 */
const TOOL_DESCRIPTION =
  'Fetches a random cat image and returns it base64-encoded with the MIME type. Useful for testing image handling.';
/** --------------------------------------------------------- */

/**
 * UI/behavior hints for clients. All supported options:
 * - title?: string — Human display name (UI hint).
 * - readOnlyHint?: boolean — True if tool does not modify environment.
 * - destructiveHint?: boolean — If not read-only, set true if updates can be destructive. Default true.
 * - idempotentHint?: boolean — If not read-only, true if repeat calls with same args have no additional effect.
 * - openWorldHint?: boolean — True if tool may interact with an open, external world (e.e., web search). Default true.
 *
 * Note: These are hints only. Clients should not rely on them for safety guarantees.
 */
const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: true,
};
/** --------------------------------------------------------- */

// External API details
const CAT_API_URL = 'https://cataas.com/cat';
const API_TIMEOUT_MS = 5000;

// API response validation
// No external API used for this tool that requires schema validation based on an external response.

//
// Schemas (input and output)
// --------------------------
const InputSchema = z
  .object({
    trigger: z
      .boolean()
      .optional()
      .default(true)
      .describe('A trigger to invoke the tool and fetch a new cat image.'),
  })
  .describe('Parameters for fetching a random image.');

const OutputSchema = z
  .object({
    data: z.string().describe('Base64 encoded image data.'),
    mimeType: z
      .string()
      .describe("The MIME type of the image (e.g., 'image/jpeg')."),
  })
  .describe('Image tool response payload.');

type ImageTestToolInput = z.infer<typeof InputSchema>;
type ImageTestToolResponse = z.infer<typeof OutputSchema>;

//
// Pure business logic (no try/catch; throw McpError on failure)
// -------------------------------------------------------------
async function imageTestToolLogic(
  input: ImageTestToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ImageTestToolResponse> {
  logger.debug('Processing template_image_test logic.', {
    ...appContext,
    toolInput: input,
  });

  const response = await fetchWithTimeout(
    CAT_API_URL,
    API_TIMEOUT_MS,
    appContext,
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => undefined);
    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      `Image API request failed: ${response.status} ${response.statusText}`,
      {
        requestId: appContext.requestId,
        httpStatusCode: response.status,
        responseBody: errorText,
      },
    );
  }

  const arrayBuf = await response.arrayBuffer();
  if (arrayBuf.byteLength === 0) {
    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      'Image API returned an empty payload.',
      { requestId: appContext.requestId },
    );
  }

  const mimeType = response.headers.get('content-type') || 'image/jpeg';

  const result: ImageTestToolResponse = {
    data: arrayBufferToBase64(arrayBuf),
    mimeType,
  };

  logger.notice('Image fetched and encoded successfully.', {
    ...appContext,
    mimeType,
    byteLength: arrayBuf.byteLength,
  });

  return result;
}

/**
 * Formats the image response as an image ContentBlock for clients that support it.
 */
function responseFormatter(result: ImageTestToolResponse): ContentBlock[] {
  return [
    {
      type: 'image',
      data: result.data,
      mimeType: result.mimeType,
    },
  ];
}

/**
 * The complete tool definition for the image test tool.
 */
export const imageTestTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:image_test:read'], imageTestToolLogic),
  responseFormatter,
};
