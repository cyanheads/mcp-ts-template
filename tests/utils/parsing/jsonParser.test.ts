/**
 * @fileoverview Tests for the JsonParser utility.
 * @module tests/utils/parsing/jsonParser.test
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseErrorCode, McpError } from "../../../src/types-global/errors";
import { logger, requestContextService } from "../../../src/utils";
import { Allow, JsonParser } from "../../../src/utils/parsing/jsonParser";

// Mock the logger to spy on its methods
vi.mock("../../../src/utils/internal/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe("JsonParser", () => {
  const parser = new JsonParser();
  const context = requestContextService.createRequestContext({
    toolName: "test-json-parser",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should parse a valid, complete JSON string", () => {
    const jsonString = '{"key": "value", "number": 123}';
    const result = parser.parse(jsonString, Allow.ALL, context);
    expect(result).toEqual({ key: "value", number: 123 });
  });

  it("should parse a partial JSON object string, stopping at the last valid token", () => {
    const partialJsonString = '{"key": "value", "number": 12';
    const result = parser.parse(partialJsonString, Allow.OBJ, context);
    expect(result).toEqual({ key: "value" });
  });

  it("should parse a partial JSON array string", () => {
    const partialJsonString = '["a", "b", 1,';
    const result = parser.parse(partialJsonString, Allow.ARR, context);
    expect(result).toEqual(["a", "b", 1]);
  });

  it("should handle a <think> block and parse the remaining JSON", () => {
    const stringWithThinkBlock =
      '<think>This is a thought.</think>  {"key": "value"}';
    const result = parser.parse(stringWithThinkBlock, Allow.ALL, context);
    expect(result).toEqual({ key: "value" });
    expect(logger.debug).toHaveBeenCalledWith(
      "LLM <think> block detected and logged.",
      expect.objectContaining({ thinkContent: "This is a thought." }),
    );
  });

  it("should handle an empty <think> block and log it", () => {
    const stringWithEmptyThinkBlock = '<think></think>{"key": "value"}';
    const result = parser.parse(stringWithEmptyThinkBlock, Allow.ALL, context);
    expect(result).toEqual({ key: "value" });
    expect(logger.debug).toHaveBeenCalledWith(
      "Empty LLM <think> block detected.",
      expect.any(Object),
    );
  });

  it("should create its own context for logging if none is provided", () => {
    const stringWithThinkBlock =
      '<think>No context here.</think>{"key": "value"}';
    parser.parse(stringWithThinkBlock);
    expect(logger.debug).toHaveBeenCalledWith(
      "LLM <think> block detected and logged.",
      expect.objectContaining({ operation: "JsonParser.thinkBlock" }),
    );
  });

  it("should throw an McpError if the string is empty after removing the <think> block", () => {
    const stringWithOnlyThinkBlock = "<think>some thoughts</think>";
    expect(() =>
      parser.parse(stringWithOnlyThinkBlock, Allow.ALL, context),
    ).toThrow(McpError);
    try {
      parser.parse(stringWithOnlyThinkBlock, Allow.ALL, context);
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.VALIDATION_ERROR);
      expect(mcpError.message).toContain("JSON string is empty");
    }
  });

  it("should correctly parse an incomplete JSON object with a partial string value", () => {
    const partialJson = '{"key": "value"';
    const result = parser.parse(partialJson, Allow.ALL, context);
    expect(result).toEqual({ key: "value" });
  });

  it("should throw an McpError if the string contains only whitespace after the <think> block", () => {
    const stringWithWhitespace = "<think>thoughts</think>   ";
    expect(() =>
      parser.parse(stringWithWhitespace, Allow.ALL, context),
    ).toThrow(
      new McpError(
        BaseErrorCode.VALIDATION_ERROR,
        "JSON string is empty after removing <think> block and trimming.",
        context,
      ),
    );
  });

  it("should handle leading/trailing whitespace in the JSON string", () => {
    const jsonWithWhitespace = '  {"key": "value"}  ';
    const result = parser.parse(jsonWithWhitespace, Allow.ALL, context);
    expect(result).toEqual({ key: "value" });
  });

  it("should wrap a parsing error in McpError and log it", () => {
    const invalidJson = "this is not json"; // Unambiguously invalid JSON
    expect(() => parser.parse(invalidJson, Allow.ALL, context)).toThrow(
      McpError,
    );
    try {
      parser.parse(invalidJson, Allow.ALL, context);
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.VALIDATION_ERROR);
      expect(mcpError.message).toContain("Failed to parse JSON");
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to parse JSON content.",
        expect.any(Object),
      );
    }
  });
});
