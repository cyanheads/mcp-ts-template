/**
 * @fileoverview Defines the core logic, schemas, and types for the `get_random_cat_fact` tool.
 * This tool fetches a random cat fact from the public Cat Fact Ninja API.
 * @module src/mcp-server/tools/catFactFetcher/logic
 **/

import { z } from "zod";
import { JsonRpcErrorCode, McpError } from "@/types-global/errors.js";
import {
  fetchWithTimeout,
  getRequestContext,
  requestContextService,
} from "@/utils/index.js";
import {
  logOperationError,
  logOperationStart,
  logOperationSuccess,
} from "@/utils/internal/logging-helpers.js";

/**
 * Zod schema for the raw response from the Cat Fact Ninja API.
 * @internal
 */
const CatFactApiSchema = z.object({
  fact: z.string(),
  length: z.number(),
});

/**
 * Zod schema for validating input arguments for the `get_random_cat_fact` tool.
 */
export const CatFactFetcherInputSchema = z.object({
  maxLength: z
    .number()
    .int("Max length must be an integer.")
    .min(1, "Max length must be at least 1.")
    .optional()
    .describe(
      "Optional: The maximum character length of the cat fact to retrieve.",
    ),
});

/**
 * TypeScript type inferred from `CatFactFetcherInputSchema`.
 */
export type CatFactFetcherInput = z.infer<typeof CatFactFetcherInputSchema>;

/**
 * Zod schema for the successful response of the `get_random_cat_fact` tool.
 */
export const CatFactFetcherResponseSchema = z.object({
  fact: z.string().describe("The retrieved cat fact."),
  length: z.number().int().describe("The character length of the cat fact."),
  requestedMaxLength: z
    .number()
    .int()
    .optional()
    .describe("The maximum length that was requested for the fact."),
  timestamp: z
    .string()
    .datetime()
    .describe("ISO 8601 timestamp of when the response was generated."),
});

/**
 * Defines the structure of the JSON payload returned by the `get_random_cat_fact` tool handler.
 */
export type CatFactFetcherResponse = z.infer<
  typeof CatFactFetcherResponseSchema
>;

/**
 * Processes the core logic for the `get_random_cat_fact` tool.
 * It calls the Cat Fact Ninja API and returns the fetched fact.
 * @param params - The validated input parameters for the tool.
 * @returns A promise that resolves to an object containing the cat fact data.
 * @throws {McpError} If the API request fails or returns an error.
 */
export async function catFactFetcherLogic(
  params: CatFactFetcherInput,
): Promise<CatFactFetcherResponse> {
  const context =
    getRequestContext() ??
    requestContextService.createRequestContext({
      operation: "catFactFetcherLogic",
    });

  logOperationStart(context, "Processing get_random_cat_fact logic.", {
    toolInput: params,
  });

  let apiUrl = "https://catfact.ninja/fact";
  if (params.maxLength !== undefined) {
    apiUrl += `?max_length=${params.maxLength}`;
  }

  logOperationStart(context, `Fetching random cat fact from: ${apiUrl}`);

  const CAT_FACT_API_TIMEOUT_MS = 5000;

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
      requestedMaxLength: params.maxLength,
      timestamp: new Date().toISOString(),
    };

    logOperationSuccess(
      context,
      "Random cat fact fetched and processed successfully.",
      { factLength: toolResponse.length },
    );

    return toolResponse;
  } catch (validationError) {
    logOperationError(
      context,
      "Cat Fact API response validation failed",
      validationError,
      { receivedData: rawData },
    );
    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      "Cat Fact API returned unexpected data format.",
      {
        ...context,
        cause: validationError,
      },
    );
  }
}
