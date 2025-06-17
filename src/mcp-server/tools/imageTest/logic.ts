/**
 * @fileoverview Core logic for the fetch_image_test tool. Fetches a random cat image.
 * @module src/mcp-server/tools/imageTest/logic
 */
import { z } from "zod";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import {
  fetchWithTimeout,
  logger,
  RequestContext,
  requestContextService,
  sanitizeInputForLogging,
} from "../../../utils/index.js";

export const FetchImageTestInputSchema = z.object({
  trigger: z
    .boolean()
    .optional()
    .default(true)
    .describe("A trigger to invoke the tool and fetch a new cat image."),
});

export type FetchImageTestInput = z.infer<typeof FetchImageTestInputSchema>;

export interface FetchImageTestResponse {
  data: string; // Base64 encoded image
  mimeType: string;
}

const CAT_API_URL = "https://cataas.com/cat";

export async function fetchImageTestLogic(
  input: FetchImageTestInput,
  parentRequestContext: RequestContext,
): Promise<FetchImageTestResponse> {
  const operationContext = requestContextService.createRequestContext({
    parentRequestId: parentRequestContext.requestId,
    operation: "fetchImageTestLogicExecution",
    input: sanitizeInputForLogging(input),
  });

  logger.info(
    `Executing 'fetch_image_test'. Trigger: ${input.trigger}`,
    operationContext,
  );

  const response = await fetchWithTimeout(CAT_API_URL, 5000, operationContext);

  if (!response.ok) {
    throw new McpError(
      BaseErrorCode.SERVICE_UNAVAILABLE,
      `Failed to fetch cat image from ${CAT_API_URL}. Status: ${response.status}`,
      {
        ...operationContext,
        statusCode: response.status,
        statusText: response.statusText,
        responseBody: await response.text().catch(() => "Could not read response body"),
      },
    );
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get("content-type") || "image/jpeg";

  return {
    data: imageBuffer.toString("base64"),
    mimeType,
  };
}
