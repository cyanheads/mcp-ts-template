/**
 * @fileoverview Tests for the requestContextService utility.
 * @module tests/utils/internal/requestContext.test
 */
import { describe, it, expect } from "vitest";
import { requestContextService } from "../../../src/utils/internal/requestContext";

describe("requestContextService", () => {
  describe("createRequestContext", () => {
    it("should create a context with an 8-character alphanumeric requestId and a timestamp", () => {
      const context = requestContextService.createRequestContext();
      const shortIdRegex = /^[A-Z0-9]{8}$/;

      expect(context).toHaveProperty("requestId");
      expect(context).toHaveProperty("timestamp");
      expect(typeof context.requestId).toBe("string");
      expect(context.requestId).toHaveLength(8);
      expect(context.requestId).toMatch(shortIdRegex);
      expect(typeof context.timestamp).toBe("string");
      // Check if timestamp is a valid ISO 8601 date string
      expect(new Date(context.timestamp).toISOString()).toBe(context.timestamp);
    });

    it("should include additional context properties", () => {
      const additionalContext = {
        userId: "user-123",
        operation: "testOperation",
      };
      const context =
        requestContextService.createRequestContext(additionalContext);
      expect(context).toMatchObject(additionalContext);
    });
  });
});
