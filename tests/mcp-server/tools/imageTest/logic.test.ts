/**
 * @fileoverview Tests for the fetch_image_test tool's core logic using real APIs.
 * @module tests/mcp-server/tools/imageTest/logic.test
 */
import { describe, it, expect, vi } from "vitest";
import { fetchImageTestLogic } from "../../../../src/mcp-server/tools/imageTest/logic";
import { requestContextService } from "../../../../src/utils";
import { McpError, BaseErrorCode } from "../../../../src/types-global/errors";

describe("fetchImageTestLogic", () => {
  const parentRequestContext = requestContextService.createRequestContext({
    toolName: "test-parent",
  });

  it("should return a base64 encoded image and mime type on success", async () => {
    const input = { trigger: true };
    const result = await fetchImageTestLogic(input, parentRequestContext);

    expect(result).toHaveProperty("data");
    expect(["image/jpeg", "image/png"]).toContain(result.mimeType);
    expect(typeof result.data).toBe("string");
    // Check if the data is a valid base64 string
    const base64Regex =
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    expect(base64Regex.test(result.data)).toBe(true);
    
    // Verify the base64 string is not empty and represents actual image data
    expect(result.data.length).toBeGreaterThan(100);
    
    // Verify we can decode the base64 back to a buffer
    const imageBuffer = Buffer.from(result.data, 'base64');
    expect(imageBuffer.length).toBeGreaterThan(0);
  });

  it("should throw an McpError if the image fetch fails with network error", async () => {
    // Test network error scenario
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const input = { trigger: true };

    await expect(
      fetchImageTestLogic(input, parentRequestContext),
    ).rejects.toThrow(McpError);

    try {
      await fetchImageTestLogic(input, parentRequestContext);
    } catch (error) {
      expect(error).toBeInstanceOf(McpError);
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.SERVICE_UNAVAILABLE);
      expect(mcpError.message).toContain("Network error");
    }

    // Restore original fetch
    global.fetch = originalFetch;
  });

  it("should throw an McpError if the API returns a bad status code", async () => {
    // Test HTTP error status code scenario
    const originalFetch = global.fetch;
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: vi.fn().mockResolvedValue('Server error details'),
    } as unknown as Response;
    
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const input = { trigger: true };

    await expect(
      fetchImageTestLogic(input, parentRequestContext),
    ).rejects.toThrow(McpError);

    try {
      await fetchImageTestLogic(input, parentRequestContext);
    } catch (error) {
      expect(error).toBeInstanceOf(McpError);
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.SERVICE_UNAVAILABLE);
      expect(mcpError.message).toContain("Failed to fetch cat image");
      expect(mcpError.message).toContain("Status: 500");
    }

    // Restore original fetch
    global.fetch = originalFetch;
  });
});
