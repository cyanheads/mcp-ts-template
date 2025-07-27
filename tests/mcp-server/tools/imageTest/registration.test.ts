import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFetchImageTestTool } from "../../../../src/mcp-server/tools/imageTest/registration";
import * as imageTestLogic from "../../../../src/mcp-server/tools/imageTest/logic";

// Mock the logic module
vi.mock("../../../../src/mcp-server/tools/imageTest/logic");

// Mock the McpServer
const mockMcpServer = {
  registerTool: vi.fn(),
} as unknown as McpServer;

describe("registerFetchImageTestTool", () => {
  it("should call server.registerTool with the correct parameters", () => {
    registerFetchImageTestTool(mockMcpServer);

    expect(mockMcpServer.registerTool).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [name, metadata, handler] = (mockMcpServer.registerTool as any).mock
      .calls[0];

    expect(name).toBe("fetch_image_test");
    expect(metadata.title).toBe("Fetch Cat Image");
    expect(typeof handler).toBe("function");
  });

  it("handler should correctly format a successful response", async () => {
    const mockLogicResponse = {
      data: "base64-encoded-string",
      mimeType: "image/jpeg",
    };
    // Make our mocked logic function resolve with our test data
    vi.spyOn(imageTestLogic, "fetchImageTestLogic").mockResolvedValue(
      mockLogicResponse,
    );

    registerFetchImageTestTool(mockMcpServer);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (mockMcpServer.registerTool as any).mock.calls[0][2];
    const result = await handler({ trigger: true });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual(mockLogicResponse);
    expect(result.content[0].type).toBe("image");
    expect(result.content[0].data).toBe(mockLogicResponse.data);
  });

  it("handler should return an error structure when the logic function throws", async () => {
    const errorMessage = "Failed to fetch image";
    vi.spyOn(imageTestLogic, "fetchImageTestLogic").mockRejectedValue(
      new Error(errorMessage),
    );

    registerFetchImageTestTool(mockMcpServer);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (mockMcpServer.registerTool as any).mock.calls[0][2];
    const result = await handler({ trigger: true });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(errorMessage);
    expect(result.structuredContent).toHaveProperty("code");
  });
});
