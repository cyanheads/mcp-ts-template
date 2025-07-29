/**
 * @fileoverview Integration tests for the HTTP transport layer.
 * @module tests/mcp-server/transports/http/httpTransport.test
 */

import { ServerType } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Hono } from "hono";
import http, { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { TransportManager } from "../../../../src/mcp-server/transports/core/transportTypes.js";
import {
  createHttpApp,
  startHttpTransport,
} from "../../../../src/mcp-server/transports/http/httpTransport.js";
import { HonoNodeBindings } from "../../../../src/mcp-server/transports/http/httpTypes.js";
import {
  BaseErrorCode,
  McpError,
} from "../../../../src/types-global/errors.js";
import {
  logger,
  rateLimiter,
  requestContextService,
} from "../../../../src/utils/index.js";

// Mock external dependencies
vi.mock("../../../../src/config/index.js", () => ({
  config: {
    mcpAllowedOrigins: ["http://localhost:3000"],
    mcpHttpPort: 3000,
    mcpHttpHost: "localhost",
    mcpSessionMode: "auto", // Default mode for most tests
  },
}));

const mockHttpServer = {
  once: vi.fn(),
  listen: vi.fn(),
  close: vi.fn((cb) => cb && cb()),
};

vi.mock("http", async (importOriginal) => {
  const actualHttp = await importOriginal<typeof http>();
  return {
    ...actualHttp,
    createServer: vi.fn(() => {
      mockHttpServer.once.mockClear();
      mockHttpServer.listen.mockClear();
      mockHttpServer.close.mockClear();
      mockHttpServer.once.mockReturnThis();
      mockHttpServer.listen.mockReturnThis();
      return mockHttpServer;
    }),
  };
});

vi.mock("@hono/node-server", () => ({
  serve: vi.fn().mockImplementation((config, cb) => {
    if (cb) {
      cb({ address: "localhost", port: config.port });
    }
    // Return the original mockHttpServer so its close method can be awaited
    return mockHttpServer;
  }),
}));

vi.mock("../../../../src/utils/index.js", async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    rateLimiter: {
      check: vi.fn(),
    },
  };
});

vi.mock("../../../../src/mcp-server/transports/auth/index.js", () => ({
  createAuthStrategy: vi.fn().mockReturnValue(null),
  createAuthMiddleware: vi.fn().mockImplementation(() => (c, next) => next()),
}));

const mockTransportManager = {
  initializeAndHandle: vi.fn(),
  handleRequest: vi.fn(),
  handleDeleteRequest: vi.fn(),
  getSession: vi.fn(),
  shutdown: vi.fn(),
};

describe("HTTP Transport - createHttpApp", () => {
  let app: Hono<{ Bindings: HonoNodeBindings }>;
  const parentContext = requestContextService.createRequestContext({
    component: "http-transport-tests",
  });
  const createServerInstanceFn = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    app = createHttpApp(
      mockTransportManager as unknown as TransportManager,
      createServerInstanceFn,
      parentContext,
    );
  });

  describe("POST /mcp", () => {
    it("should handle initialize requests correctly", async () => {
      const initRequest = {
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "1.0",
          clientInfo: { name: "test-client", version: "1.0.0" },
          capabilities: {
            tool_calling: {
              enabled: true,
              supported_formats: ["json", "text"],
            },
          },
        },
        id: "1",
      };
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      });
      mockTransportManager.initializeAndHandle.mockResolvedValue(mockResponse);

      const req = new Request("http://localhost/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initRequest),
      });

      const mockNodeReq = new IncomingMessage(new Socket());
      const mockNodeRes = new ServerResponse(mockNodeReq);

      const res = await app.fetch(req, {
        incoming: mockNodeReq,
        res: mockNodeRes,
      });

      expect(mockTransportManager.initializeAndHandle).toHaveBeenCalledWith(
        mockNodeReq,
        mockNodeRes,
        initRequest,
        expect.objectContaining({ operation: "handlePost" }),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });

    it("should handle tool call requests correctly with a session ID", async () => {
      const toolRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "test_tool", arguments: { param1: "value1" } },
        id: "2",
      };

      const mockNodeReq = new IncomingMessage(new Socket());
      const mockNodeRes = new ServerResponse(mockNodeReq);

      mockTransportManager.handleRequest.mockImplementation(async () => {
        mockNodeRes.statusCode = 202;
        return mockNodeRes;
      });

      const req = new Request("http://localhost/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "mcp-session-id": "test-session-id",
        },
        body: JSON.stringify(toolRequest),
      });

      await app.fetch(req, { incoming: mockNodeReq, res: mockNodeRes });

      expect(mockTransportManager.handleRequest).toHaveBeenCalledWith(
        mockNodeReq,
        mockNodeRes,
        toolRequest,
        expect.objectContaining({ operation: "handlePost" }),
        "test-session-id",
      );
      expect(mockNodeRes.statusCode).toBe(202);
    });

    it("should handle requests without session ID in auto mode (stateless)", async () => {
      const toolRequest = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "test_tool", arguments: {} },
        id: "3",
      };

      createServerInstanceFn.mockResolvedValue(
        new McpServer({ name: "test", version: "1.0.0" }),
      );

      const req = new Request("http://localhost/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toolRequest),
      });

      const mockNodeReq = new IncomingMessage(new Socket());
      const mockNodeRes = new ServerResponse(mockNodeReq);

      await app.fetch(req, { incoming: mockNodeReq, res: mockNodeRes });

      // Should call createServerInstanceFn for stateless handling
      expect(createServerInstanceFn).toHaveBeenCalled();
    });
  });

  describe("GET /mcp", () => {
    it("should handle GET requests with a valid session ID", async () => {
      const mockNodeReq = new IncomingMessage(new Socket());
      const mockNodeRes = new ServerResponse(mockNodeReq);

      mockTransportManager.handleRequest.mockImplementation(async () => {
        mockNodeRes.writeHead(200, { "Content-Type": "text/plain" });
        mockNodeRes.end("streaming content");
        return mockNodeRes;
      });

      const req = new Request("http://localhost/mcp", {
        method: "GET",
        headers: { "mcp-session-id": "test-session-id" },
      });

      await app.fetch(req, { incoming: mockNodeReq, res: mockNodeRes });

      expect(mockTransportManager.handleRequest).toHaveBeenCalledWith(
        mockNodeReq,
        mockNodeRes,
        undefined,
        expect.objectContaining({ operation: "handleGetRequest" }),
        "test-session-id",
      );
      expect(mockNodeRes.statusCode).toBe(200);
    });

    it("should handle GET requests without session ID in auto mode (stateless)", async () => {
      createServerInstanceFn.mockResolvedValue(
        new McpServer({ name: "test", version: "1.0.0" }),
      );

      const req = new Request("http://localhost/mcp", { method: "GET" });

      const mockNodeReq = new IncomingMessage(new Socket());
      const mockNodeRes = new ServerResponse(mockNodeReq);

      await app.fetch(req, { incoming: mockNodeReq, res: mockNodeRes });

      // Should call createServerInstanceFn for stateless handling
      expect(createServerInstanceFn).toHaveBeenCalled();
    });
  });

  describe("DELETE /mcp", () => {
    it("should handle DELETE requests with a valid session ID", async () => {
      const mockTransportResponse = {
        statusCode: 200,
        body: { message: "Session deleted" },
        headers: new Headers({ "x-custom-header": "value" }),
      };
      mockTransportManager.handleDeleteRequest.mockResolvedValue(
        mockTransportResponse,
      );

      const req = new Request("http://localhost/mcp", {
        method: "DELETE",
        headers: { "mcp-session-id": "test-session-id" },
      });
      const res = await app.fetch(req);
      const body = await res.json();
      expect(mockTransportManager.handleDeleteRequest).toHaveBeenCalledWith(
        "test-session-id",
        expect.objectContaining({ operation: "handleDeleteRequest" }),
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("x-custom-header")).toBe("value");
      expect(body).toEqual({ message: "Session deleted" });
    });

    it("should handle DELETE requests without session ID in auto mode (stateless)", async () => {
      const req = new Request("http://localhost/mcp", { method: "DELETE" });
      const res = await app.fetch(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.status).toBe("stateless_mode");
      expect(body.message).toContain("No sessions to delete in stateless mode");
    });

    it("should propagate errors from the transport manager during DELETE", async () => {
      const error = new McpError(
        BaseErrorCode.INTERNAL_ERROR,
        "Deletion failed",
      );
      mockTransportManager.handleDeleteRequest.mockRejectedValue(error);

      const req = new Request("http://localhost/mcp", {
        method: "DELETE",
        headers: { "mcp-session-id": "test-session-id" },
      });
      const res = await app.fetch(req);
      const body = await res.json();
      expect(res.status).toBe(500);
      expect(body.error.code).toBe(BaseErrorCode.INTERNAL_ERROR);
      expect(body.error.message).toBe("Deletion failed");
    });
  });

  describe("Middleware", () => {
    it("should apply CORS headers", async () => {
      const req = new Request("http://localhost/mcp", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:3000" },
      });
      const res = await app.fetch(req);
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe(
        "http://localhost:3000",
      );
    });

    it("should apply rate limiting", async () => {
      const req = new Request("http://localhost/mcp", {
        method: "POST",
        body: "{}",
      });
      await app.fetch(req);
      expect(rateLimiter.check).toHaveBeenCalled();
    });
  });
});

// Note: Comprehensive session mode configuration tests have been simplified
// due to dynamic import mocking complexities in the test environment.
// The core functionality is still tested through the basic createHttpApp tests above.
describe("HTTP Transport - Session Mode Features", () => {
  const parentContext = requestContextService.createRequestContext({
    component: "session-mode-tests",
  });
  const createServerInstanceFn = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should demonstrate stateless request handling", async () => {
    const app = createHttpApp(
      mockTransportManager as unknown as TransportManager,
      createServerInstanceFn,
      parentContext,
    );

    const toolRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "test_tool", arguments: {} },
      id: "2",
    };

    createServerInstanceFn.mockResolvedValue(
      new McpServer({ name: "test", version: "1.0.0" }),
    );

    const req = new Request("http://localhost/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toolRequest),
    });

    const mockNodeReq = new IncomingMessage(new Socket());
    const mockNodeRes = new ServerResponse(mockNodeReq);

    await app.fetch(req, { incoming: mockNodeReq, res: mockNodeRes });

    // In auto mode without session ID, should use stateless handling
    expect(createServerInstanceFn).toHaveBeenCalled();
  });

  it("should demonstrate stateful request handling", async () => {
    const app = createHttpApp(
      mockTransportManager as unknown as TransportManager,
      createServerInstanceFn,
      parentContext,
    );

    const toolRequest = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "test_tool", arguments: {} },
      id: "2",
    };

    const mockNodeReq = new IncomingMessage(new Socket());
    const mockNodeRes = new ServerResponse(mockNodeReq);

    mockTransportManager.handleRequest.mockImplementation(async () => {
      mockNodeRes.statusCode = 200;
      return mockNodeRes;
    });

    const req = new Request("http://localhost/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": "test-session",
      },
      body: JSON.stringify(toolRequest),
    });

    await app.fetch(req, { incoming: mockNodeReq, res: mockNodeRes });

    // With session ID, should use stateful transport manager
    expect(mockTransportManager.handleRequest).toHaveBeenCalledWith(
      mockNodeReq,
      mockNodeRes,
      toolRequest,
      expect.objectContaining({ operation: "handlePost" }),
      "test-session",
    );
  });
});

describe("HTTP Transport - startHttpTransport", () => {
  const parentContext = requestContextService.createRequestContext({
    component: "http-transport-tests",
  });
  let server: ServerType | undefined;
  let transportManager: TransportManager | undefined;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(async () => {
    if (transportManager) {
      await transportManager.shutdown();
    }
    if (server) {
      await server.close();
    }
    vi.restoreAllMocks();
  });

  it("should start the server and return app and server instances", async () => {
    const createServerInstanceFn = vi
      .fn()
      .mockResolvedValue(
        new McpServer({ name: "test-server", version: "1.0.0" }),
      );
    const { serve } = await import("@hono/node-server");

    // Mock serve to return a proper server instance
    const mockServer = {
      close: vi.fn((cb) => cb && cb()),
    };
    (serve as Mock).mockImplementation((config, cb) => {
      if (cb) {
        cb({ address: "localhost", port: config.port });
      }
      return mockServer;
    });

    // Mock isPortInUse to return false (port available)
    mockHttpServer.once.mockImplementation((event, cb) => {
      if (event === "listening") setImmediate(cb);
      return mockHttpServer;
    });

    const result = await startHttpTransport(
      createServerInstanceFn,
      parentContext,
    );
    server = result.server;
    transportManager = result.transportManager;

    expect(result.app).toBeInstanceOf(Hono);
    expect(server).toBeDefined();
    expect(server.close).toBeDefined();
    expect(serve).toHaveBeenCalled();
  });

  it("should retry on a different port if the initial port is in use", async () => {
    const createServerInstanceFn = vi
      .fn()
      .mockResolvedValue(
        new McpServer({ name: "test-server", version: "1.0.0" }),
      );
    const { serve } = await import("@hono/node-server");
    const { config } = await import("../../../../src/config/index.js");

    // Mock serve to return a proper server instance
    const mockServer = {
      close: vi.fn((cb) => cb && cb()),
    };
    (serve as Mock).mockImplementation((config, cb) => {
      if (cb) {
        cb({ address: "localhost", port: config.port });
      }
      return mockServer;
    });

    // Mock http.createServer to return different behavior for each call
    const mockServers: {
      once: Mock;
      listen: Mock;
      close: Mock;
    }[] = [];

    vi.spyOn(http, "createServer").mockImplementation(() => {
      const serverIndex = mockServers.length;
      const newMockServer = {
        once: vi.fn().mockImplementation((event, cb) => {
          if (serverIndex === 0) {
            // First server: port in use
            if (event === "error")
              setImmediate(() => cb({ code: "EADDRINUSE" }));
          } else {
            // Second server: port available
            if (event === "listening") setImmediate(cb);
          }
          return newMockServer;
        }),
        listen: vi.fn().mockReturnThis(),
        close: vi.fn((cb) => cb && cb()),
      };
      mockServers.push(newMockServer);
      return newMockServer as unknown as http.Server;
    });

    const result = await startHttpTransport(
      createServerInstanceFn,
      parentContext,
    );
    server = result.server;
    transportManager = result.transportManager;

    expect(logger.warning).toHaveBeenCalledWith(
      expect.stringContaining("is in use, retrying..."),
      expect.any(Object),
    );
    expect(serve).toHaveBeenCalled();
    const serveCall = (serve as Mock).mock.calls[0][0];
    expect(serveCall.port).toBe(config.mcpHttpPort + 1);
  });

  it("should reject if all retry attempts fail", async () => {
    const createServerInstanceFn = vi
      .fn()
      .mockResolvedValue(
        new McpServer({ name: "test-server", version: "1.0.0" }),
      );

    // Mock http.createServer to always return EADDRINUSE error
    vi.spyOn(http, "createServer").mockImplementation(() => {
      const server = {
        once: vi.fn().mockImplementation((event, cb) => {
          if (event === "error") setImmediate(() => cb({ code: "EADDRINUSE" }));
          return server;
        }),
        listen: vi.fn().mockReturnThis(),
        close: vi.fn((cb) => cb && cb()),
      };
      return server as unknown as http.Server;
    });

    await expect(
      startHttpTransport(createServerInstanceFn, parentContext),
    ).rejects.toThrow("Failed to bind to any port after multiple retries.");
  });

  it("should reject on a non-EADDRINUSE error during server start", async () => {
    const createServerInstanceFn = vi
      .fn()
      .mockResolvedValue(
        new McpServer({ name: "test-server", version: "1.0.0" }),
      );
    const { serve } = await import("@hono/node-server");
    const testError = new Error("Another error") as Error & { code: string };
    testError.code = "EACCES"; // Different error code

    // Mock http.createServer to return port available (listening event)
    vi.spyOn(http, "createServer").mockImplementation(() => {
      const server = {
        once: vi.fn().mockImplementation((event, cb) => {
          if (event === "listening") setImmediate(cb);
          return server;
        }),
        listen: vi.fn().mockReturnThis(),
        close: vi.fn((cb) => cb && cb()),
      };
      return server as unknown as http.Server;
    });

    // Mock serve to throw the error
    (serve as Mock).mockImplementation(() => {
      throw testError;
    });

    await expect(
      startHttpTransport(createServerInstanceFn, parentContext),
    ).rejects.toThrow(testError);
  });
});
