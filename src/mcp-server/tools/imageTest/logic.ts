/**
 * @fileoverview Defines the core logic, schemas, and types for the `fetch_image_test` tool.
 * This tool fetches a random cat image from the public cataas.com API.
 * @module src/mcp-server/tools/imageTest/logic
 * @see {@link src/mcp-server/tools/imageTest/registration.ts} for the handler and registration logic.
 */
import { z } from "zod";
import {
  fetchWithTimeout,
  logger,
  RequestContext,
} from "../../../utils/index.js";

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
  context: RequestContext,
): Promise<FetchImageTestResponse> {
  logger.info(
    `Executing 'fetch_image_test'. Trigger: ${input.trigger}`,
    context,
  );

  const response = await fetchWithTimeout(CAT_API_URL, 5000, context);

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get("content-type") || "image/jpeg";

  return {
    data: imageBuffer.toString("base64"),
    mimeType,
  };
}
