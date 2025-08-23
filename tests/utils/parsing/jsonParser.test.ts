/**
 * @fileoverview Tests for the JsonParser utility.
 * @module tests/utils/parsing/jsonParser.test
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestContextService } from "../../../src/utils";
import { Allow, JsonParser } from "../../../src/utils/parsing/jsonParser";

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

  it("should correctly parse an incomplete JSON object with a partial string value", () => {
    const partialJson = '{"key": "value"';
    const result = parser.parse(partialJson, Allow.ALL, context);
    expect(result).toEqual({ key: "value" });
  });

  it("should handle leading/trailing whitespace in the JSON string", () => {
    const jsonWithWhitespace = '  {"key": "value"}  ';
    const result = parser.parse(jsonWithWhitespace, Allow.ALL, context);
    expect(result).toEqual({ key: "value" });
  });
});
