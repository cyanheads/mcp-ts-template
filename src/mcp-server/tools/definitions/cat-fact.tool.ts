/**
 * @fileoverview The complete definition for the 'get_random_cat_fact' tool.
 * This file encapsulates the tool's schema, logic, and metadata,
 * making it a self-contained and modular component.
 * @module src/mcp-server/tools/definitions/cat-fact.tool
 */
import { z } from 'zod';

import { JsonRpcErrorCode, McpError } from '../../../types-global/errors.js';
import {
  type RequestContext,
  fetchWithTimeout,
  logger,
} from '../../../utils/index.js';
import { ToolDefinition } from '../utils/toolDefinition.js';

const CAT_FACT_API_URL = 'https://catfact.ninja/fact';
const CAT_FACT_API_TIMEOUT_MS = 5000;

const CatFactApiSchema = z.object({
  fact: z.string(),
  length: z.number(),
});

const InputSchema = z.object({
  maxLength: z
    .number()
    .int('Max length must be an integer.')
    .min(1, 'Max length must be at least 1.')
    .optional()
    .describe(
      'Optional: The maximum character length of the cat fact to retrieve.',
    ),
});

const OutputSchema = z.object({
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
});

type CatFactFetcherInput = z.infer<typeof InputSchema>;
type CatFactFetcherResponse = z.infer<typeof OutputSchema>;

async function catFactFetcherLogic(
  input: CatFactFetcherInput,
  context: RequestContext,
): Promise<CatFactFetcherResponse> {
  logger.debug('Processing get_random_cat_fact logic.', {
    ...context,
    toolInput: input,
  });

  let apiUrl = CAT_FACT_API_URL;
  if (input.maxLength !== undefined) {
    apiUrl += `?max_length=${input.maxLength}`;
  }

  logger.info(`Fetching random cat fact from: ${apiUrl}`, context);

  const response = await fetchWithTimeout(
    apiUrl,
    CAT_FACT_API_TIMEOUT_MS,
    context,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      `Cat Fact API request failed: ${response.status} ${response.statusText}`,
      {
        ...context,
        httpStatusCode: response.status,
        responseBody: errorText,
      },
    );
  }

  const rawData = await response.json();

  try {
    const data = CatFactApiSchema.parse(rawData);

    const toolResponse: CatFactFetcherResponse = {
      fact: data.fact,
      length: data.length,
      requestedMaxLength: input.maxLength,
      timestamp: new Date().toISOString(),
    };

    logger.notice('Random cat fact fetched and processed successfully.', {
      ...context,
      factLength: toolResponse.length,
    });

    return toolResponse;
  } catch (validationError) {
    logger.error('Cat Fact API response validation failed', {
      ...context,
      error: validationError,
      receivedData: rawData,
    });
    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      'Cat Fact API returned unexpected data format.',
      {
        ...context,
        cause: validationError,
      },
    );
  }
}

export const catFactTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: 'get_random_cat_fact',
  description:
    'Fetches a random cat fact from a public API. Optionally, a maximum length for the fact can be specified.',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: { readOnlyHint: true, openWorldHint: true },
  logic: catFactFetcherLogic,
};
