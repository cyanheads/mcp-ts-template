/**
 * @fileoverview The complete definition for the 'fetch_image_test' tool.
 * This file encapsulates the tool's schema, logic, and metadata,
 * making it a self-contained and modular component.
 * @module src/mcp-server/tools/definitions/image-test.tool
 */

import { z } from "zod";
import {
  fetchWithTimeout,
  logger,
  RequestContext,
} from "../../../utils/index.js";
import { ToolDefinition } from "../utils/toolDefinition.js";
import { ContentBlock } from "@modelcontextprotocol/sdk/types.js";

const CAT_API_URL = "https://cataas.com/cat";
const API_TIMEOUT_MS = 5000;

const InputSchema = z.object({
  trigger: z
    .boolean()
    .optional()
    .default(true)
    .describe("A trigger to invoke the tool and fetch a new cat image."),
});

const OutputSchema = z.object({
  data: z.string().describe("Base64 encoded image data."),
  mimeType: z
    .string()
    .describe("The MIME type of the image (e.g., 'image/jpeg')."),
});

type FetchImageTestInput = z.infer<typeof InputSchema>;
type FetchImageTestResponse = z.infer<typeof OutputSchema>;

async function fetchImageTestLogic(
  input: FetchImageTestInput,
  context: RequestContext,
): Promise<FetchImageTestResponse> {
  logger.info(
    `Executing 'fetch_image_test'. Trigger: ${input.trigger}`,
    context,
  );

  const response = await fetchWithTimeout(CAT_API_URL, API_TIMEOUT_MS, context);

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get("content-type") || "image/jpeg";

  return {
    data: imageBuffer.toString("base64"),
    mimeType,
  };
}

function responseFormatter(result: FetchImageTestResponse): ContentBlock[] {
  return [
    {
      type: "image",
      data: result.data,
      mimeType: result.mimeType,
    },
  ];
}

export const imageTestTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: "fetch_image_test",
  description:
    "Fetches a random cat image from an external API (cataas.com) and returns it as a blob. Useful for testing image handling capabilities.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: { readOnlyHint: true, openWorldHint: true },
  logic: fetchImageTestLogic,
  responseFormatter: responseFormatter,
};
