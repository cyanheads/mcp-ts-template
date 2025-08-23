import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import { registerFetchImageTestTool } from "../../../../src/mcp-server/tools/imageTest/registration";

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
});
