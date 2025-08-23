/**
 * @fileoverview Provides a utility for performance monitoring of tool execution.
 * This module introduces a higher-order function to wrap tool logic, measure its
 * execution time, and log a structured metrics event.
 * @module src/utils/internal/performance
 */

import { SpanStatusCode, trace } from "@opentelemetry/api";
import {
  ATTR_CODE_FUNCTION,
  ATTR_CODE_NAMESPACE,
} from "../telemetry/semconv.js";
import { config } from "../../config/index.js";
import { McpError } from "../../types-global/errors.js";
import { getRequestContext } from "./asyncContext.js";
import { logOperationSuccess } from "./logging-helpers.js";
import { requestContextService } from "./requestContext.js";

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
 * @param toolName - The name of the tool being executed.
 * @param toolLogicFn - The asynchronous tool logic function to be executed and measured.
 * @param inputPayload - The input payload to the tool for size calculation.
 * @returns A promise that resolves with the result of the tool logic function.
 * @throws Re-throws any error caught from the tool logic function after logging the failure.
 */
export async function measureToolExecution<T>(
  toolName: string,
  toolLogicFn: () => Promise<T>,
  inputPayload: unknown,
): Promise<T> {
  // Ensure a valid context exists for logging and tracing.
  const context =
    getRequestContext() ??
    requestContextService.createRequestContext({
      operation: `measureToolExecution:${toolName}`,
    });

  const tracer = trace.getTracer(
    config.openTelemetry.serviceName,
    config.openTelemetry.serviceVersion,
  );

  return tracer.startActiveSpan(`tool_execution:${toolName}`, async (span) => {
    span.setAttributes({
      [ATTR_CODE_FUNCTION]: toolName,
      [ATTR_CODE_NAMESPACE]: "mcp-tools",
      "mcp.tool.input_bytes": getPayloadSize(inputPayload),
    });

    const startTime = process.hrtime.bigint();
    let isSuccess = false;
    let errorCode: number | string | undefined;
    let outputPayload: T | undefined;

    try {
      const result = await toolLogicFn();
      isSuccess = true;
      outputPayload = result;
      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute("mcp.tool.output_bytes", getPayloadSize(outputPayload));
      return result;
    } catch (error) {
      if (error instanceof McpError) {
        errorCode = error.code;
      } else if (error instanceof Error) {
        errorCode = "UNHANDLED_ERROR";
      } else {
        errorCode = "UNKNOWN_ERROR";
      }

      if (error instanceof Error) {
        span.recordException(error);
      }
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });

      throw error;
    } finally {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;

      span.setAttributes({
        "mcp.tool.duration_ms": parseFloat(durationMs.toFixed(2)),
        "mcp.tool.success": isSuccess,
      });
      if (errorCode) {
        span.setAttribute("mcp.tool.error_code", errorCode);
      }

      span.end();

      logOperationSuccess(context, "Tool execution finished.", {
        performance: {
          toolName,
          durationMs: parseFloat(durationMs.toFixed(2)),
          isSuccess,
          errorCode,
          inputBytes: getPayloadSize(inputPayload),
          outputBytes: getPayloadSize(outputPayload),
        },
      });
    }
  });
}
