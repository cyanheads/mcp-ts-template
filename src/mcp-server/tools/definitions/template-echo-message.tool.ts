/**
 * @fileoverview Complete, declarative definition for the 'template_echo_message' tool.
 * Emphasizes a clean, top‑down flow with configurable metadata at the top,
 * schema definitions next, pure logic, and finally the exported ToolDefinition.
 * @module src/mcp-server/tools/definitions/template-echo-message.tool
 */
import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type {
  SdkContext,
  ToolAnnotations,
  ToolDefinition,
} from '@/mcp-server/tools/utils/index.js';
import { markdown, getStringProperty } from '@/utils/index.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { type RequestContext, logger } from '@/utils/index.js';

/**
 * Programmatic tool name (must be unique).
 * Naming convention (recommended): <server-prefix>_<action>_<object>
 * - Use a short, stable server prefix for discoverability across servers.
 * - Use lowercase snake_case.
 * - Examples: 'template_echo_message', 'template_cat_fact'.
 */
const TOOL_NAME = 'template_echo_message';
/** --------------------------------------------------------- */

/** Human-readable title used by UIs. */
const TOOL_TITLE = 'Template Echo Message';
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
  'Echoes a message back with optional formatting and repetition.';
/** --------------------------------------------------------- */

/**
 * UI/behavior hints for clients. All supported options:
 * - title?: string — Human display name (UI hint).
 * - readOnlyHint?: boolean — True if tool does not modify environment.
 * - destructiveHint?: boolean — If not read-only, set true if updates can be destructive. Default true.
 * - idempotentHint?: boolean — If not read-only, true if repeat calls with same args have no additional effect.
 * - openWorldHint?: boolean — True if tool may interact with an open, external world (e.g., web search). Default true.
 *
 * Note: These are hints only. Clients should not rely on them for safety guarantees.
 */
const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};
/** --------------------------------------------------------- */

/** Supported formatting modes. */
const ECHO_MODES = ['standard', 'uppercase', 'lowercase'] as const;
/** Default mode when not provided. */
const DEFAULT_MODE: (typeof ECHO_MODES)[number] = 'standard';
/** Default repeat count. */
const DEFAULT_REPEAT = 1;
/** Default includeTimestamp behavior. */
const DEFAULT_INCLUDE_TIMESTAMP = false;
/** Special input which deliberately triggers a failure for testing. */
export const TEST_ERROR_TRIGGER_MESSAGE = 'TRIGGER_ERROR';

//
// Schemas (input and output)
// --------------------------
const InputSchema = z
  .object({
    message: z
      .string()
      .min(1, 'Message cannot be empty.')
      .max(1000, 'Message cannot exceed 1000 characters.')
      .describe(
        `The message to echo back. To trigger a test error, provide '${TEST_ERROR_TRIGGER_MESSAGE}'.`,
      ),
    mode: z
      .enum(ECHO_MODES)
      .default(DEFAULT_MODE)
      .describe(
        "How to format the message ('standard' | 'uppercase' | 'lowercase').",
      ),
    repeat: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(DEFAULT_REPEAT)
      .describe('Number of times to repeat the formatted message.'),
    includeTimestamp: z
      .boolean()
      .default(DEFAULT_INCLUDE_TIMESTAMP)
      .describe('Whether to include an ISO 8601 timestamp in the response.'),
  })
  .describe('Echo a message with optional formatting and repetition.');

const OutputSchema = z
  .object({
    originalMessage: z
      .string()
      .describe('The original message provided in the input.'),
    formattedMessage: z
      .string()
      .describe('The message after applying the specified formatting.'),
    repeatedMessage: z
      .string()
      .describe('The final message repeated the requested number of times.'),
    mode: z.enum(ECHO_MODES).describe('The formatting mode that was applied.'),
    repeatCount: z
      .number()
      .int()
      .min(1)
      .describe('The number of times the message was repeated.'),
    timestamp: z
      .string()
      .datetime()
      .optional()
      .describe(
        'Optional ISO 8601 timestamp of when the response was generated.',
      ),
  })
  .describe('Echo tool response payload.');

type EchoToolInput = z.infer<typeof InputSchema>;
type EchoToolResponse = z.infer<typeof OutputSchema>;

//
// Pure business logic (no try/catch; throw McpError on failure)
// -------------------------------------------------------------
async function echoToolLogic(
  input: EchoToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<EchoToolResponse> {
  logger.debug('Processing echo message logic.', {
    ...appContext,
    toolInput: input,
  });

  if (input.message === TEST_ERROR_TRIGGER_MESSAGE) {
    const errorData: Record<string, unknown> = {
      requestId: appContext.requestId,
    };
    const traceId = getStringProperty(appContext, 'traceId');
    if (traceId) {
      errorData.traceId = traceId;
    }
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      'Deliberate failure triggered.',
      errorData,
    );
  }

  const formattedMessage =
    input.mode === 'uppercase'
      ? input.message.toUpperCase()
      : input.mode === 'lowercase'
        ? input.message.toLowerCase()
        : input.message;

  const repeatedMessage = Array(input.repeat).fill(formattedMessage).join(' ');

  const response: EchoToolResponse = {
    originalMessage: input.message,
    formattedMessage,
    repeatedMessage,
    mode: input.mode,
    repeatCount: input.repeat,
    ...(input.includeTimestamp && { timestamp: new Date().toISOString() }),
  };

  return Promise.resolve(response);
}

/**
 * Formats a concise human-readable summary while structuredContent carries the full payload.
 *
 * @example Before (manual string concatenation):
 * ```typescript
 * const lines = [
 *   `Echo (mode=${result.mode}, repeat=${result.repeatCount})`,
 *   preview,
 *   result.timestamp ? `timestamp=${result.timestamp}` : undefined,
 * ].filter(Boolean) as string[];
 * return [{ type: 'text', text: lines.join('\n') }];
 * ```
 *
 * @example After (using MarkdownBuilder):
 * ```typescript
 * // For tight line formatting without blank lines, use text() with manual newlines
 * const md = markdown()
 *   .text(`Echo (mode=${result.mode}, repeat=${result.repeatCount})\n`)
 *   .text(`${preview}`);
 *
 * // Apply conditional content after builder is initialized
 * md.when(!!result.timestamp, () => {
 *   md.text(`\ntimestamp=${result.timestamp}`);
 * });
 *
 * return [{ type: 'text', text: md.build() }];
 * ```
 */
function responseFormatter(result: EchoToolResponse): ContentBlock[] {
  const preview =
    result.repeatedMessage.length > 200
      ? `${result.repeatedMessage.slice(0, 197)}…`
      : result.repeatedMessage;

  // Using MarkdownBuilder for consistent, semantic formatting
  // Using text() with manual newlines for tight line formatting
  const md = markdown()
    .text(`Echo (mode=${result.mode}, repeat=${result.repeatCount})\n`)
    .text(`${preview}`);

  // Apply conditional content after builder is initialized
  md.when(!!result.timestamp, () => {
    md.text(`\ntimestamp=${result.timestamp}`);
  });

  return [
    {
      type: 'text',
      text: md.build(),
    },
  ];
}

/**
 * The complete tool definition for the echo tool.
 */
export const echoTool: ToolDefinition<typeof InputSchema, typeof OutputSchema> =
  {
    name: TOOL_NAME,
    title: TOOL_TITLE,
    description: TOOL_DESCRIPTION,
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
    annotations: TOOL_ANNOTATIONS,
    logic: withToolAuth(['tool:echo:read'], echoToolLogic),
    responseFormatter,
  };
