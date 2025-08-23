/**
 * @fileoverview Defines the core logic, schemas, and types for the `fetch_image_test` tool.
 * This tool fetches a random cat image from the public cataas.com API.
 * @module src/mcp-server/tools/imageTest/logic
 **/

import { z } from "zod";
import { JsonRpcErrorCode, McpError } from "@/types-global/errors.js";
import {
  fetchWithTimeout,
  getRequestContext,
  requestContextService,
} from "@/utils/index.js";
import { logOperationStart } from "@/utils/internal/logging-helpers.js";

export const FetchImageTestInputSchema = z.object({
  trigger: z
    .boolean()
    .optional()
    .default(true)
    .describe("A trigger to invoke the tool and fetch a new cat image."),
});

export type FetchImageTestInput = z.infer<typeof FetchImageTestInputSchema>;

export const FetchImageTestResponseSchema = z.object({
  data: z.string().describe("Base64 encoded image data."),
  mimeType: z
    .string()
    .describe("The MIME type of the image (e.g., 'image/jpeg')."),
});

export type FetchImageTestResponse = z.infer<
  typeof FetchImageTestResponseSchema
>;

const CAT_API_URL = "https://cataas.com/cat";

export async function fetchImageTestLogic(
  input: FetchImageTestInput,
): Promise<FetchImageTestResponse> {
  const context =
    getRequestContext() ??
    requestContextService.createRequestContext({
      operation: "fetchImageTestLogic",
    });

  logOperationStart(
    context,
    `Executing 'fetch_image_test'. Trigger: ${input.trigger}`,
  );

  const response = await fetchWithTimeout(CAT_API_URL, 5000, context);

  if (!response.ok) {
    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      `Image API request failed: ${response.status} ${response.statusText}`,
      { ...context, httpStatusCode: response.status },
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      "Image API returned a non-image response.",
      { ...context, contentType },
    );
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());

  return {
    data: imageBuffer.toString("base64"),
    mimeType: contentType,
  };
}
