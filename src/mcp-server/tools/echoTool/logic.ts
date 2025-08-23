/**
 * @fileoverview Defines the core logic, schemas, and types for the `echo_message` tool.
 * This module is the single source of truth for the tool's data contracts (Zod schemas)
 * and its pure business logic.
 * @module src/mcp-server/tools/echoTool/logic
 **/

import { z } from "zod";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import { getRequestContext } from "../../../utils/index.js";
import { logger } from "../../../utils/internal/logger.js";

/**
 * Defines the valid formatting modes for the echo tool operation.
 */
export const ECHO_MODES = ["standard", "uppercase", "lowercase"] as const;

/**
 * A constant for the magic string used to trigger a test error.
 * This improves maintainability by avoiding hardcoded strings.
 */
const TEST_ERROR_TRIGGER_MESSAGE = "fail";

/**
 * Zod schema defining the input parameters for the `echo_message` tool.
 * CRITICAL: The descriptions are sent to the LLM and must be clear.
 */
export const EchoToolInputSchema = z.object({
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

/**
 * Zod schema for the successful response of the `echo_message` tool.
 */
export const EchoToolResponseSchema = z.object({
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

// Inferred TypeScript types
export type EchoToolInput = z.infer<typeof EchoToolInputSchema>;
export type EchoToolResponse = z.infer<typeof EchoToolResponseSchema>;

/**
 * Processes the core logic for the `echo_message` tool.
 * This function is pure; it processes inputs and returns a result or throws an error.
 * It retrieves the request context from AsyncLocalStorage.
 *
 * @param params - The validated input parameters.
 * @returns A promise resolving with the structured response data.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function echoToolLogic(
  params: EchoToolInput,
): Promise<EchoToolResponse> {
  const context = getRequestContext();
  logger.debug(
    { ...context, toolInput: params },
    "Processing echo message logic.",
  );

  // The logic layer MUST throw a structured error on failure.
  if (params.message === TEST_ERROR_TRIGGER_MESSAGE) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      `Deliberate failure triggered: the message was '${TEST_ERROR_TRIGGER_MESSAGE}'.`,
      { toolName: "echo_message" },
    );
  }

  let formattedMessage = params.message;
  switch (params.mode) {
    case "uppercase":
      formattedMessage = params.message.toUpperCase();
      break;
    case "lowercase":
      formattedMessage = params.message.toLowerCase();
      break;
  }

  const repeatedMessage = Array(params.repeat).fill(formattedMessage).join(" ");

  const response: EchoToolResponse = {
    originalMessage: params.message,
    formattedMessage,
    repeatedMessage,
    mode: params.mode,
    repeatCount: params.repeat,
  };

  if (params.includeTimestamp) {
    response.timestamp = new Date().toISOString();
  }

  logger.debug(
    {
      ...context,
      responseSummary: {
        messageLength: response.repeatedMessage.length,
        timestampGenerated: !!response.timestamp,
      },
    },
    "Echo message processed successfully.",
  );

  return response;
}
