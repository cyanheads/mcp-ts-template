/**
 * @fileoverview Tests for the fetch_image_test tool's core logic.
 * @module tests/mcp-server/tools/imageTest/logic.test
 */
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { server } from "../../../mocks/server";
import { catImageErrorHandlers } from "../../../mocks/handlers";
import { fetchImageTestLogic } from "../../../../src/mcp-server/tools/imageTest/logic";
import { requestContextService } from "../../../../src/utils";
import { McpError, BaseErrorCode } from "../../../../src/types-global/errors";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("fetchImageTestLogic", () => {
  const parentRequestContext = requestContextService.createRequestContext({
    toolName: "test-parent",
  });

  it("should return a base64 encoded image and mime type on success", async () => {
    const input = { trigger: true };
    const result = await fetchImageTestLogic(input, parentRequestContext);

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("mimeType", "image/jpeg");
    expect(typeof result.data).toBe("string");
    // Check if the data is a valid base64 string
    const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    expect(base64Regex.test(result.data)).toBe(true);
  });

  it("should throw an McpError if the image fetch fails", async () => {
    server.use(catImageErrorHandlers.internalError);

    const input = { trigger: true };

    await expect(
      fetchImageTestLogic(input, parentRequestContext)
    ).rejects.toThrow(McpError);

    try {
      await fetchImageTestLogic(input, parentRequestContext);
    } catch (error) {
      expect(error).toBeInstanceOf(McpError);
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.SERVICE_UNAVAILABLE);
      expect(mcpError.message).toContain("Failed to fetch cat image");
    }
  });
});
