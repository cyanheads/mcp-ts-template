/**
 * @fileoverview Tests for the dateParser utility.
 * @module tests/utils/parsing/dateParser.test
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as chrono from "chrono-node";
import { dateParser } from "../../../src/utils/parsing/dateParser";
import { requestContextService } from "../../../src/utils";
import { McpError, BaseErrorCode } from "../../../src/types-global/errors";

vi.mock("chrono-node");

describe("dateParser", () => {
  const context = requestContextService.createRequestContext({
    toolName: "test-date-parser",
  });
  const refDate = new Date("2025-01-01T12:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseDate", () => {
    it("should parse a valid date string and return a Date object", async () => {
      const expectedDate = new Date("2025-01-02T12:00:00.000Z");
      vi.spyOn(chrono, "parseDate").mockReturnValue(expectedDate);

      const result = await dateParser.parseDate("tomorrow", context, refDate);
      expect(result).toEqual(expectedDate);
      expect(chrono.parseDate).toHaveBeenCalledWith("tomorrow", refDate, {
        forwardDate: true,
      });
    });

    it("should return null for an unparsable date string", async () => {
      vi.spyOn(chrono, "parseDate").mockReturnValue(null);

      const result = await dateParser.parseDate("not a date", context, refDate);
      expect(result).toBeNull();
    });

    it("should throw an McpError if chrono-node throws an unexpected error", async () => {
      const testError = new Error("Chrono blew up");
      vi.spyOn(chrono, "parseDate").mockImplementation(() => {
        throw testError;
      });

      await expect(
        dateParser.parseDate("any date", context, refDate),
      ).rejects.toThrow(McpError);

      try {
        await dateParser.parseDate("any date", context, refDate);
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(BaseErrorCode.PARSING_ERROR);
        expect(mcpError.message).toContain("Chrono blew up");
      }
    });
  });

  describe("parse", () => {
    it("should return detailed parsing results for a valid date string", async () => {
      const mockParsedResult = [
        { start: { date: () => new Date() }, text: "tomorrow" },
      ] as chrono.ParsedResult[];
      vi.spyOn(chrono, "parse").mockReturnValue(mockParsedResult);

      const result = await dateParser.parse("tomorrow", context, refDate);
      expect(result).toEqual(mockParsedResult);
      expect(chrono.parse).toHaveBeenCalledWith("tomorrow", refDate, {
        forwardDate: true,
      });
    });

    it("should return an empty array if no dates are found", async () => {
      vi.spyOn(chrono, "parse").mockReturnValue([]);

      const result = await dateParser.parse("no dates here", context, refDate);
      expect(result).toEqual([]);
    });

    it("should throw an McpError if chrono-node throws an unexpected error", async () => {
      const testError = new Error("Chrono blew up again");
      vi.spyOn(chrono, "parse").mockImplementation(() => {
        throw testError;
      });

      await expect(
        dateParser.parse("any date", context, refDate),
      ).rejects.toThrow(McpError);

      try {
        await dateParser.parse("any date", context, refDate);
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(BaseErrorCode.PARSING_ERROR);
        expect(mcpError.message).toContain("Chrono blew up again");
      }
    });
  });
});
