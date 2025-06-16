/**
 * @fileoverview Defines the core logic, schemas, and types for the `get_random_cat_fact` tool.
 * This tool fetches a random cat fact from the public Cat Fact Ninja API.
 * @module src/mcp-server/tools/catFactFetcher/logic
 */

import { z } from "zod";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import {
  fetchWithTimeout,
  logger,
  type RequestContext,
} from "../../../utils/index.js";

/**
 * Zod schema for validating input arguments for the `get_random_cat_fact` tool.
 */
export const CatFactFetcherInputSchema = z
  .object({
    maxLength: z
      .number()
      .int("Max length must be an integer.")
      .min(1, "Max length must be at least 1.")
      .optional()
      .describe(
        "Optional: The maximum character length of the cat fact to retrieve.",
      ),
  })
  .describe(
    "Input schema for the get_random_cat_fact tool. Allows specifying a maximum length for the fact.",
  );

/**
 * TypeScript type inferred from `CatFactFetcherInputSchema`.
 */
export type CatFactFetcherInput = z.infer<typeof CatFactFetcherInputSchema>;

/**
 * Defines the structure of the JSON payload returned by the `get_random_cat_fact` tool handler.
 */
export interface CatFactFetcherResponse {
  fact: string;
  length: number;
  requestedMaxLength?: number;
  timestamp: string;
}

/**
 * Processes the core logic for the `get_random_cat_fact` tool.
 * It calls the Cat Fact Ninja API and returns the fetched fact.
 * @param params - The validated input parameters for the tool.
 * @param context - The request context for logging and tracing.
 * @returns A promise that resolves to an object containing the cat fact data.
 * @throws {McpError} If the API request fails or returns an error.
 */
export async function catFactFetcherLogic(
  params: CatFactFetcherInput,
  context: RequestContext,
): Promise<CatFactFetcherResponse> {
  logger.debug("Processing get_random_cat_fact logic.", { ...context, toolInput: params });

  let apiUrl = "https://catfact.ninja/fact";
  if (params.maxLength !== undefined) {
    apiUrl += `?max_length=${params.maxLength}`;
  }

  logger.info(`Fetching random cat fact from: ${apiUrl}`, context);

  const CAT_FACT_API_TIMEOUT_MS = 5000;

  const response = await fetchWithTimeout(
    apiUrl,
    CAT_FACT_API_TIMEOUT_MS,
    context,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new McpError(
      BaseErrorCode.SERVICE_UNAVAILABLE,
      `Cat Fact API request failed: ${response.status} ${response.statusText}`,
      {
        ...context,
        httpStatusCode: response.status,
        responseBody: errorText,
      },
    );
  }

  const data = await response.json();

  const toolResponse: CatFactFetcherResponse = {
    fact: data.fact,
    length: data.length,
    requestedMaxLength: params.maxLength,
    timestamp: new Date().toISOString(),
  };

  logger.notice("Random cat fact fetched and processed successfully.", {
    ...context,
    factLength: toolResponse.length,
  });

  return toolResponse;
}
