/**
 * @fileoverview Tests for the registration of the echo_message tool.
 * @module tests/mcp-server/tools/echoTool/registration.test
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerEchoTool } from "../../../../src/mcp-server/tools/echoTool/registration";
import * as logic from "../../../../src/mcp-server/tools/echoTool/logic";
import { BaseErrorCode, McpError } from "../../../../src/types-global/errors";

// Mock the logic module
vi.mock("../../../../src/mcp-server/tools/echoTool/logic");

describe("registerEchoTool", () => {
  const mockMcpServer = {
    registerTool: vi.fn(),
  } as unknown as McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call server.registerTool with the correct parameters", async () => {
    await registerEchoTool(mockMcpServer);

    expect(mockMcpServer.registerTool).toHaveBeenCalledOnce();
    const [name, metadata, handler] = (mockMcpServer.registerTool as Mock).mock
      .calls[0];

    expect(name).toBe("echo_message");
    expect(metadata.title).toBe("Echo Message");
    expect(typeof handler).toBe("function");
  });

  it("handler should correctly format a successful response", async () => {
    const mockLogicResponse = {
      originalMessage: "hello",
      formattedMessage: "HELLO",
      repeatedMessage: "HELLO",
      mode: "uppercase" as const,
      repeatCount: 1,
      timestamp: new Date().toISOString(),
    };
    vi.spyOn(logic, "echoToolLogic").mockResolvedValue(mockLogicResponse);

    await registerEchoTool(mockMcpServer);
    const handler = (mockMcpServer.registerTool as Mock).mock.calls[0][2];
    const result = await handler({ message: "hello", mode: "uppercase" });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual(mockLogicResponse);
    expect(result.content[0].text).toContain("HELLO");
  });

  it("handler should return an error structure when the logic function throws", async () => {
    const errorMessage = "Failed to echo";
    vi.spyOn(logic, "echoToolLogic").mockRejectedValue(
      new McpError(BaseErrorCode.VALIDATION_ERROR, errorMessage),
    );

    await registerEchoTool(mockMcpServer);
    const handler = (mockMcpServer.registerTool as Mock).mock.calls[0][2];
    const result = await handler({ message: "fail" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(errorMessage);
    expect(result.structuredContent).toHaveProperty(
      "code",
      BaseErrorCode.VALIDATION_ERROR,
    );
  });
});
