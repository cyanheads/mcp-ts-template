/**
 * @fileoverview Tests for the main MCP server entry point.
 * @module tests/mcp-server/server.test
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../../src/config/index.js";
import { initializeAndStartServer } from "../../src/mcp-server/server.js";
import { startStdioTransport } from "../../src/mcp-server/transports/stdio/index.js";
import { startHttpTransport } from "../../src/mcp-server/transports/http/index.js";
import { ErrorHandler } from "../../src/utils/index.js";
import { registerEchoResource } from "../../src/mcp-server/resources/echoResource/index.js";
import { registerEchoTool } from "../../src/mcp-server/tools/echoTool/index.js";
import { registerCatFactFetcherTool } from "../../src/mcp-server/tools/catFactFetcher/index.js";
import { registerFetchImageTestTool } from "../../src/mcp-server/tools/imageTest/index.js";

// Mock dependencies
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  const McpServer = vi.fn().mockImplementation(() => ({
    registerTool: vi.fn(),
    registerResource: vi.fn(),
    connect: vi.fn(), // Add the connect method to the mock
  }));
  return { McpServer };
});

vi.mock("../../src/config/index.js", async () => {
  return {
    config: {
      mcpServerName: "test-server",
      mcpServerVersion: "1.0.0",
      mcpTransportType: "stdio", // Default for tests
    },
    environment: "test",
  };
});

vi.mock("../../src/utils/index.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../src/utils/index.js")>();
  return {
    ...(original as Record<string, unknown>),
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      crit: vi.fn(),
    },
    ErrorHandler: {
      handleError: vi.fn(),
      tryCatch: vi.fn(async (fn) => fn()),
    },
    requestContextService: {
      createRequestContext: vi.fn((ctx) => ({ ...ctx, id: "test-request-id" })),
      configure: vi.fn(),
    },
  };
});

vi.mock("../../src/mcp-server/resources/echoResource/index.js", () => ({
  registerEchoResource: vi.fn(),
}));

vi.mock("../../src/mcp-server/tools/catFactFetcher/index.js", () => ({
  registerCatFactFetcherTool: vi.fn(),
}));

vi.mock("../../src/mcp-server/tools/echoTool/index.js", () => ({
  registerEchoTool: vi.fn(),
}));

vi.mock("../../src/mcp-server/tools/imageTest/index.js", () => ({
  registerFetchImageTestTool: vi.fn(),
}));

vi.mock("../../src/mcp-server/transports/http/index.js", () => ({
  startHttpTransport: vi.fn().mockResolvedValue({ server: "mock-http-server" }),
}));

vi.mock("../../src/mcp-server/transports/stdio/index.js", () => ({
  startStdioTransport: vi.fn(),
}));

describe("MCP Server Initialization", () => {
  let exitSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.exit to prevent tests from terminating the process
    exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it("should initialize and start with stdio transport", async () => {
    config.mcpTransportType = "stdio";
    await initializeAndStartServer();
    expect(McpServer).toHaveBeenCalledTimes(1);
    expect(startStdioTransport).toHaveBeenCalledTimes(1);
    expect(startHttpTransport).not.toHaveBeenCalled();
    expect(registerEchoResource).toHaveBeenCalled();
    expect(registerEchoTool).toHaveBeenCalled();
    expect(registerCatFactFetcherTool).toHaveBeenCalled();
    expect(registerFetchImageTestTool).toHaveBeenCalled();
  });

  it("should initialize and start with http transport", async () => {
    config.mcpTransportType = "http";
    await initializeAndStartServer();
    expect(startHttpTransport).toHaveBeenCalledTimes(1);
    // createMcpServerInstance is passed as a factory to startHttpTransport,
    // so McpServer constructor itself is not called directly in this test path.
    expect(McpServer).not.toHaveBeenCalled();
    expect(startStdioTransport).not.toHaveBeenCalled();
  });

  it("should throw an error for an unsupported transport type and exit", async () => {
    (config as unknown as { mcpTransportType: string }).mcpTransportType =
      "invalid";
    await initializeAndStartServer();
    expect(ErrorHandler.handleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        operation: "initializeAndStartServer_Catch",
        critical: true,
      }),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle critical errors during initialization and exit", async () => {
    config.mcpTransportType = "stdio";
    const testError = new Error("Critical Failure");
    vi.mocked(startStdioTransport).mockRejectedValueOnce(testError);

    await initializeAndStartServer();

    expect(ErrorHandler.handleError).toHaveBeenCalledWith(
      testError,
      expect.objectContaining({
        operation: "initializeAndStartServer_Catch",
        critical: true,
      }),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle registration failures gracefully and exit", async () => {
    config.mcpTransportType = "stdio";
    const registrationError = new Error("Registration failed");
    vi.mocked(registerEchoTool).mockRejectedValueOnce(registrationError);

    await initializeAndStartServer();

    expect(ErrorHandler.handleError).toHaveBeenCalledWith(
      registrationError,
      expect.objectContaining({
        operation: "initializeAndStartServer_Catch",
        critical: true,
      }),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
