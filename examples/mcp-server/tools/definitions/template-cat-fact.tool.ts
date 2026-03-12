/**
 * @fileoverview Template cat fact tool — demonstrates external API calls with the `tool()` builder.
 * Fetches a random cat fact from a public API with optional maximum length.
 * @module examples/mcp-server/tools/definitions/template-cat-fact.tool
 */

import { z } from 'zod';

import { tool } from '@cyanheads/mcp-ts-core';
import { JsonRpcErrorCode, McpError } from '@cyanheads/mcp-ts-core/errors';
import { fetchWithTimeout } from '@cyanheads/mcp-ts-core/utils/network';

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
    .describe('Optional: The maximum character length of the cat fact to retrieve.'),
});

const OutputSchema = z.object({
  fact: z.string().describe('The retrieved cat fact.'),
  length: z.number().int().describe('The character length of the cat fact.'),
  requestedMaxLength: z
    .number()
    .int()
    .optional()
    .describe('The maximum length that was requested for the fact.'),
  timestamp: z.iso
    .datetime()
    .describe('ISO 8601 timestamp of when the response was generated.'),
});

export const catFactTool = tool('template_cat_fact', {
  title: 'Template Cat Fact',
  description: 'Fetches a random cat fact from a public API with an optional maximum length.',
  input: InputSchema,
  output: OutputSchema,
  auth: ['tool:cat_fact:read'],
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },

  async handler(input, ctx) {
    ctx.log.debug('Processing template_cat_fact', { toolInput: input });

    const url =
      input.maxLength !== undefined
        ? `${CAT_FACT_API_URL}?max_length=${input.maxLength}`
        : CAT_FACT_API_URL;

    ctx.log.info(`Fetching random cat fact from: ${url}`);

    const reqCtx = { requestId: ctx.requestId, timestamp: ctx.timestamp };
    const response = await fetchWithTimeout(url, CAT_FACT_API_TIMEOUT_MS, reqCtx, {
      signal: ctx.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => undefined);
      throw new McpError(
        JsonRpcErrorCode.ServiceUnavailable,
        `Cat Fact API request failed: ${response.status} ${response.statusText}`,
        { requestId: ctx.requestId, httpStatusCode: response.status, responseBody: errorText },
      );
    }

    const rawData = await response.json();
    const parsed = CatFactApiSchema.safeParse(rawData);
    if (!parsed.success) {
      ctx.log.error('Cat Fact API response validation failed', undefined, {
        receivedData: rawData,
        issues: parsed.error.issues,
      });
      throw new McpError(
        JsonRpcErrorCode.ServiceUnavailable,
        'Cat Fact API returned unexpected data format.',
        { requestId: ctx.requestId, issues: parsed.error.issues },
      );
    }

    ctx.log.notice('Random cat fact fetched successfully.', { factLength: parsed.data.length });

    return {
      fact: parsed.data.fact,
      length: parsed.data.length,
      requestedMaxLength: input.maxLength,
      timestamp: new Date().toISOString(),
    };
  },

  format(result) {
    const maxPart =
      typeof result.requestedMaxLength === 'number' ? `, max<=${result.requestedMaxLength}` : '';
    const header = `Cat Fact (length=${result.length}${maxPart})`;
    const preview = result.fact.length > 300 ? `${result.fact.slice(0, 297)}…` : result.fact;
    return [{ type: 'text', text: [header, preview, `timestamp=${result.timestamp}`].join('\n') }];
  },
});
