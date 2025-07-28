/**
 * @fileoverview Tests for the JsonParser utility.
 * @module tests/utils/parsing/jsonParser.test
 */
import { describe, it, expect } from "vitest";
import { JsonParser, Allow } from "../../../src/utils/parsing/jsonParser";
import { requestContextService } from "../../../src/utils";
import { McpError, BaseErrorCode } from "../../../src/types-global/errors";

describe("JsonParser", () => {
  const parser = new JsonParser();
  const context = requestContextService.createRequestContext({
    toolName: "test-json-parser",
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
  });

  it("should handle an empty <think> block", () => {
    const stringWithEmptyThinkBlock = '<think></think>{"key": "value"}';
    const result = parser.parse(stringWithEmptyThinkBlock, Allow.ALL, context);
    expect(result).toEqual({ key: "value" });
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

  it("should throw an McpError with detailed context on failure", () => {
    const invalidJson = "{key: 'value'}"; // Invalid quotes
    try {
      parser.parse(invalidJson, Allow.ALL, context);
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.VALIDATION_ERROR);
      expect(mcpError.message).toContain("Failed to parse JSON");
      expect(mcpError.details).toHaveProperty("originalContentSample");
      expect(mcpError.details).toHaveProperty("rawError");
    }
  });
});
