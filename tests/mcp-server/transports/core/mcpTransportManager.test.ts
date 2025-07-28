/**
 * @fileoverview Tests for the McpTransportManager.
 * @module tests/mcp-server/transports/core/mcpTransportManager.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpTransportManager } from "../../../../src/mcp-server/transports/core/mcpTransportManager.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpError } from "../../../../src/types-global/errors.js";
import { RequestContext } from "../../../../src/utils/index.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

vi.mock("@modelcontextprotocol/sdk/server/mcp.js");
vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js");
vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
  isInitializeRequest: vi.fn(),
}));

describe("McpTransportManager", () => {
  let mockCreateServerInstance: () => Promise<McpServer>;
  let transportManager: McpTransportManager;
  let mockRequestContext: RequestContext;
  let mockServer: McpServer;

  beforeEach(() => {
    mockServer = new McpServer({ name: "test", version: "1.0.0" });
    mockServer.connect = vi.fn();
    mockCreateServerInstance = vi.fn().mockResolvedValue(mockServer);
    transportManager = new McpTransportManager(mockCreateServerInstance);
    mockRequestContext = { requestId: "test", timestamp: new Date().toISOString() };
    vi.clearAllMocks();
  });

  describe("initializeSession", () => {
    it("should initialize a new session successfully", async () => {
      vi.mocked(isInitializeRequest).mockReturnValue(true);
      
      // Capture the onsessioninitialized callback
      let onSessionInitializedCallback: (sessionId: string) => void = () => {};
      vi.mocked(StreamableHTTPServerTransport).mockImplementation(opts => {
        onSessionInitializedCallback = opts.onsessioninitialized!;
        return {
          sessionId: "mock-session-id",
          handleRequest: vi.fn(),
          close: vi.fn(),
        } as unknown as StreamableHTTPServerTransport;
      });

      const promise = transportManager.initializeSession(
        { jsonrpc: "2.0", method: "initialize" },
        mockRequestContext,
      );
      
      // Manually trigger the callback to simulate session initialization
      onSessionInitializedCallback("mock-session-id");

      const response = await promise;

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("status", "initialized");
      expect(response.sessionId).toBe("mock-session-id");
      expect(mockServer.connect).toHaveBeenCalled();
    });

    it("should throw an error for an invalid initialization request", async () => {
      vi.mocked(isInitializeRequest).mockReturnValue(false);
      await expect(
        transportManager.initializeSession({ jsonrpc: "2.0", method: "invalid" }, mockRequestContext),
      ).rejects.toThrow(McpError);
    });
  });
});
