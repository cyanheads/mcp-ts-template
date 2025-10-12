/**
 * @fileoverview Complete, declarative definition for the 'template_cat_fact' tool.
 * Mirrors the updated tool structure used by the echo tool: metadata constants,
 * Zod schemas, pure logic (no try/catch), and an optional response formatter.
 * @module src/mcp-server/tools/definitions/template-cat-fact.tool
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

/**
 * Programmatic tool name (must be unique).
 * Naming convention (recommended): <server-prefix>_<action>_<object>
 * - Use a short, stable server prefix for discoverability across servers.
 * - Use lowercase snake_case.
 * - Examples: 'template_echo_message', 'template_cat_fact'.
 */
const TOOL_NAME = 'template_cat_fact';
/** --------------------------------------------------------- */

/** Human-readable title used by UIs. */
const TOOL_TITLE = 'Template Cat Fact';
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
  'Fetches a random cat fact from a public API with an optional maximum length.';
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
  openWorldHint: true,
  idempotentHint: true,
};
/** --------------------------------------------------------- */

// External API details
const CAT_FACT_API_URL = 'https://catfact.ninja/fact';
const CAT_FACT_API_TIMEOUT_MS = 5000;

// API response validation
const CatFactApiSchema = z.object({
  fact: z.string(),
  length: z.number(),
});

//
// Schemas (input and output)
// --------------------------
const InputSchema = z
  .object({
    maxLength: z
      .number()
      .int('Max length must be an integer.')
      .min(1, 'Max length must be at least 1.')
      .optional()
      .describe(
        'Optional: The maximum character length of the cat fact to retrieve.',
      ),
  })
  .describe('Parameters for fetching a random cat fact.');

const OutputSchema = z
  .object({
    fact: z.string().describe('The retrieved cat fact.'),
    length: z.number().int().describe('The character length of the cat fact.'),
    requestedMaxLength: z
      .number()
      .int()
      .optional()
      .describe('The maximum length that was requested for the fact.'),
    timestamp: z
      .string()
      .datetime()
      .describe('ISO 8601 timestamp of when the response was generated.'),
  })
  .describe('Cat fact tool response payload.');

type CatFactToolInput = z.infer<typeof InputSchema>;
type CatFactToolResponse = z.infer<typeof OutputSchema>;

//
// Pure business logic (no try/catch; throw McpError on failure)
// -------------------------------------------------------------
async function catFactToolLogic(
  input: CatFactToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<CatFactToolResponse> {
  logger.debug('Processing template_cat_fact logic.', {
    ...appContext,
    toolInput: input,
  });

  const url =
    input.maxLength !== undefined
      ? `${CAT_FACT_API_URL}?max_length=${input.maxLength}`
      : CAT_FACT_API_URL;

  logger.info(`Fetching random cat fact from: ${url}`, appContext);

  const response = await fetchWithTimeout(
    url,
    CAT_FACT_API_TIMEOUT_MS,
    appContext,
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => undefined);
    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      `Cat Fact API request failed: ${response.status} ${response.statusText}`,
      {
        requestId: appContext.requestId,
        httpStatusCode: response.status,
        responseBody: errorText,
      },
    );
  }

  const rawData = await response.json();
  const parsed = CatFactApiSchema.safeParse(rawData);
  if (!parsed.success) {
    logger.error('Cat Fact API response validation failed', {
      ...appContext,
      receivedData: rawData,
      issues: parsed.error.issues,
    });
    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      'Cat Fact API returned unexpected data format.',
      {
        requestId: appContext.requestId,
        issues: parsed.error.issues,
      },
    );
  }

  const data = parsed.data;
  const toolResponse: CatFactToolResponse = {
    fact: data.fact,
    length: data.length,
    requestedMaxLength: input.maxLength,
    timestamp: new Date().toISOString(),
  };

  logger.notice('Random cat fact fetched and processed successfully.', {
    ...appContext,
    factLength: toolResponse.length,
  });

  return toolResponse;
}

/**
 * Formats a concise human-readable summary while structuredContent carries the full payload.
 */
function responseFormatter(result: CatFactToolResponse): ContentBlock[] {
  const maxPart =
    typeof result.requestedMaxLength === 'number'
      ? `, max<=${result.requestedMaxLength}`
      : '';
  const header = `Cat Fact (length=${result.length}${maxPart})`;
  const preview =
    result.fact.length > 300 ? `${result.fact.slice(0, 297)}…` : result.fact;
  const lines = [header, preview, `timestamp=${result.timestamp}`];
  return [{ type: 'text', text: lines.filter(Boolean).join('\n') }];
}

/**
 * The complete tool definition for the cat fact tool.
 */
export const catFactTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:cat_fact:read'], catFactToolLogic),
  responseFormatter,
};
