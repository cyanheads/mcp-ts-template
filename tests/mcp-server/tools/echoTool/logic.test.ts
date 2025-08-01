import { describe, expect, it } from "vitest";
import {
  EchoToolInputSchema,
  echoToolLogic,
  EchoToolResponseSchema,
} from "../../../../src/mcp-server/tools/echoTool/logic";
import { BaseErrorCode, McpError } from "../../../../src/types-global/errors";
import { requestContextService } from "../../../../src/utils";

describe("echoToolLogic", () => {
  const context = requestContextService.createRequestContext({
    toolName: "echo_message",
  });

  it("should return a valid response for valid input", async () => {
    const mockInput = {
      message: "hello world",
      mode: "uppercase" as const,
      repeat: 2,
      includeTimestamp: true,
    };
    const result = await echoToolLogic(mockInput, context);

    // Validate that the output matches the response schema
    const validation = EchoToolResponseSchema.safeParse(result);
    expect(validation.success).toBe(true);

    if (validation.success) {
      expect(result.originalMessage).toBe(mockInput.message);
      expect(result.formattedMessage).toBe("HELLO WORLD");
      expect(result.repeatedMessage).toBe("HELLO WORLD HELLO WORLD");
      expect(typeof result.timestamp).toBe("string");
    }
  });

  it("should handle lowercase mode correctly", async () => {
    const mockInput = {
      message: "HELLO WORLD",
      mode: "lowercase" as const,
      repeat: 1,
      includeTimestamp: false,
    };
    const result = await echoToolLogic(mockInput, context);
    const validation = EchoToolResponseSchema.safeParse(result);
    expect(validation.success).toBe(true);

    if (validation.success) {
      expect(result.formattedMessage).toBe("hello world");
      expect(result.repeatedMessage).toBe("hello world");
      expect(result.timestamp).toBeUndefined();
    }
  });

  it('should throw an McpError with correct details when the message is "fail"', async () => {
    const input = {
      message: "fail",
      mode: "standard" as const,
      repeat: 1,
      includeTimestamp: true,
    };

    await expect(echoToolLogic(input, context)).rejects.toThrow(
      new McpError(
        BaseErrorCode.VALIDATION_ERROR,
        "Deliberate failure triggered: the message was 'fail'.",
        { toolName: "echo_message" },
      ),
    );
  });

  it("should handle empty message correctly based on Zod schema", async () => {
    // Zod schema min(1) should prevent this from ever reaching the logic function
    // but we test the principle. The handler would catch this validation error.
    const input = {
      message: "",
      mode: "standard" as const,
      repeat: 1,
      includeTimestamp: true,
    };
    const parseResult = EchoToolInputSchema.safeParse(input);
    expect(parseResult.success).toBe(false);
  });
});
