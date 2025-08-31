/**
 * @fileoverview The complete definition for the 'echo_message' tool.
 * This file encapsulates the tool's schema, logic, and metadata,
 * making it a self-contained and modular component.
 * @module src/mcp-server/tools/definitions/echo.tool
 */

import { z } from "zod";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, RequestContext } from "../../../utils/index.js";
import { ToolDefinition } from "../utils/toolDefinition.js";

const ECHO_MODES = ["standard", "uppercase", "lowercase"] as const;
const TEST_ERROR_TRIGGER_MESSAGE = "fail";

const InputSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(1000, "Message cannot exceed 1000 characters.")
    .describe(
      `The message to echo back. To trigger a test error, provide the exact message '${TEST_ERROR_TRIGGER_MESSAGE}'.`,
    ),
  mode: z
    .enum(ECHO_MODES)
    .optional()
    .default("standard")
    .describe(
      "Specifies how the message should be formatted. Defaults to 'standard'.",
    ),
  repeat: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(1)
    .describe("The number of times to repeat the message. Defaults to 1."),
  includeTimestamp: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Whether to include an ISO 8601 timestamp in the response. Defaults to true.",
    ),
});

const OutputSchema = z.object({
  originalMessage: z
    .string()
    .describe("The original message provided in the input."),
  formattedMessage: z
    .string()
    .describe("The message after applying the specified formatting mode."),
  repeatedMessage: z
    .string()
    .describe("The formatted message repeated the specified number of times."),
  mode: z.enum(ECHO_MODES).describe("The formatting mode that was applied."),
  repeatCount: z
    .number()
    .int()
    .min(1)
    .describe("The number of times the message was repeated."),
  timestamp: z
    .string()
    .datetime()
    .optional()
    .describe(
      "Optional ISO 8601 timestamp of when the response was generated.",
    ),
});

type EchoToolInput = z.infer<typeof InputSchema>;
type EchoToolResponse = z.infer<typeof OutputSchema>;

async function echoToolLogic(
  input: EchoToolInput,
  context: RequestContext,
): Promise<EchoToolResponse> {
  logger.debug("Processing echo message logic.", {
    ...context,
    toolInput: input,
  });
  if (input.message === TEST_ERROR_TRIGGER_MESSAGE) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      `Deliberate failure triggered.`,
    );
  }
  let formattedMessage = input.message;
  if (input.mode === "uppercase")
    formattedMessage = input.message.toUpperCase();
  if (input.mode === "lowercase")
    formattedMessage = input.message.toLowerCase();
  const repeatedMessage = Array(input.repeat).fill(formattedMessage).join(" ");
  const response: EchoToolResponse = {
    originalMessage: input.message,
    formattedMessage,
    repeatedMessage,
    mode: input.mode,
    repeatCount: input.repeat,
  };
  if (input.includeTimestamp) {
    response.timestamp = new Date().toISOString();
  }
  return response;
}

// The Tool Definition
export const echoTool: ToolDefinition<typeof InputSchema, typeof OutputSchema> =
  {
    name: "echo_message",
    description:
      "Echoes a message back with optional formatting and repetition.",
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: true, openWorldHint: false },
    logic: echoToolLogic,
  };
