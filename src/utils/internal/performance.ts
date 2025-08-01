/**
 * @fileoverview Provides a utility for performance monitoring of tool execution.
 * This module introduces a higher-order function to wrap tool logic, measure its
 * execution time, and log a structured metrics event.
 * @module src/utils/internal/performance
 */

import { McpError } from "../../types-global/errors.js";
import { logger } from "./logger.js";
import { RequestContext } from "./requestContext.js";

/**
 * Calculates the size of a payload in bytes.
 * @param payload - The payload to measure.
 * @returns The size in bytes.
 * @private
 */
function getPayloadSize(payload: unknown): number {
  if (!payload) return 0;
  try {
    const stringified = JSON.stringify(payload);
    return Buffer.byteLength(stringified, "utf8");
  } catch {
    return 0; // Could not stringify
  }
}

/**
 * A higher-order function that wraps a tool's core logic to measure its performance
 * and log a structured metrics event upon completion.
 *
 * @template T The expected return type of the tool's logic function.
 * @param toolLogicFn - The asynchronous tool logic function to be executed and measured.
 * @param context - The request context for the operation, used for logging and tracing.
 * @param inputPayload - The input payload to the tool for size calculation.
 * @returns A promise that resolves with the result of the tool logic function.
 * @throws Re-throws any error caught from the tool logic function after logging the failure.
 */
export async function measureToolExecution<T>(
  toolLogicFn: () => Promise<T>,
  context: RequestContext & { toolName: string },
  inputPayload: unknown,
): Promise<T> {
  const startTime = process.hrtime.bigint();
  let isSuccess = false;
  let errorCode: string | undefined;
  let outputPayload: T | undefined;

  try {
    const result = await toolLogicFn();
    isSuccess = true;
    outputPayload = result;
    return result;
  } catch (error) {
    if (error instanceof McpError) {
      errorCode = error.code;
    } else if (error instanceof Error) {
      errorCode = "UNHANDLED_ERROR";
    } else {
      errorCode = "UNKNOWN_ERROR";
    }
    // Re-throw the error to be handled by the tool's registration handler
    throw error;
  } finally {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    logger.info("Tool execution finished.", {
      ...context,
      metrics: {
        durationMs: parseFloat(durationMs.toFixed(2)),
        isSuccess,
        errorCode,
        inputBytes: getPayloadSize(inputPayload),
        outputBytes: getPayloadSize(outputPayload),
      },
    });
  }
}
