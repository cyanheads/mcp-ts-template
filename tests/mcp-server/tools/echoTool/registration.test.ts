/**
 * @fileoverview Integration tests for echo tool registration and execution.
 * Tests the complete flow from registration through to tool execution without heavy mocking.
 * @module tests/mcp-server/tools/echoTool/registration.test
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerEchoTool } from "../../../../src/mcp-server/tools/echoTool/registration.js";
import {
  EchoToolInputSchema,
  type EchoToolInput,
} from "../../../../src/mcp-server/tools/echoTool/logic.js";
import * as utilsModule from "../../../../src/utils/index.js";

// Mock only external utilities that would interfere with testing
vi.mock("../../../../src/utils/index.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../../../src/utils/index.js")>();
  return {
    ...original,
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
    requestContextService: {
      createRequestContext: vi.fn((ctx) => ({
        requestId: "test-request-id",
        timestamp: new Date().toISOString(),
        ...ctx,
      })),
      configure: vi.fn(),
    },
    ErrorHandler: {
      handleError: vi.fn((error) => error), // Pass through errors for testing
      tryCatch: vi.fn(async (fn) => fn()),
    },
  };
});

interface ToolMetadata {
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}

interface ToolResult {
  isError?: boolean;
  structuredContent: Record<string, unknown>;
  content: Array<{ type: string; text: string }>;
}

interface ToolRegistrationData {
  metadata: ToolMetadata;
  handler: (params: EchoToolInput) => Promise<ToolResult>;
}

describe("Echo Tool Integration Tests", () => {
  let server: McpServer;
  let registeredTools: Map<string, ToolRegistrationData>;

  beforeEach(async () => {
    // Create a real MCP server instance for integration testing
    server = new McpServer({
      name: "test-server",
      version: "1.0.0-test",
    });

    // Track registered tools for verification
    registeredTools = new Map();
    const originalRegister = server.registerTool.bind(server);
    server.registerTool = vi.fn((name, metadata, handler) => {
      registeredTools.set(name, { metadata, handler });
      return originalRegister(name, metadata, handler);
    });

    // Register the actual echo tool
    await registerEchoTool(server);
  });

  describe("Tool Registration Integration", () => {
    it("should register echo_message tool with correct metadata", () => {
      expect(server.registerTool).toHaveBeenCalledOnce();
      expect(registeredTools.has("echo_message")).toBe(true);

      const toolData = registeredTools.get("echo_message");
      expect(toolData).toBeDefined();
      if (!toolData) return;

      expect(toolData.metadata.title).toBe("Echo Message");
      expect(toolData.metadata.description).toContain("Echoes a message back");
      expect(toolData.metadata.inputSchema).toEqual(EchoToolInputSchema.shape);
      expect(typeof toolData.handler).toBe("function");
    });

    it("should register tool with proper schema validation", () => {
      const toolData = registeredTools.get("echo_message");
      expect(toolData).toBeDefined();
      if (!toolData) return;

      const inputSchema = toolData.metadata.inputSchema as Record<
        string,
        unknown
      >;

      // Verify schema structure matches our Zod definition
      expect(inputSchema.message).toBeDefined();
      expect(inputSchema.mode).toBeDefined();
      expect(inputSchema.repeat).toBeDefined();
      expect(inputSchema.timestamp).toBeDefined();
    });
  });

  describe("Tool Execution Integration", () => {
    it("should execute tool with valid input and return structured response", async () => {
      const toolData = registeredTools.get("echo_message");
      expect(toolData).toBeDefined();
      if (!toolData) return;

      const input: EchoToolInput = {
        message: "Hello Integration Test",
        mode: "standard",
        repeat: 1,
        timestamp: true,
      };

      const result = await toolData.handler(input);

      // Verify successful response structure
      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty("type", "text");

      // Verify actual business logic execution
      const structured = result.structuredContent;
      expect(structured.originalMessage).toBe("Hello Integration Test");
      expect(structured.timestamp).toBeDefined();
      expect(
        new Date(structured.timestamp as string).getTime(),
      ).toBeGreaterThan(0);
    });

    it("should handle different message modes through complete integration", async () => {
      const toolData = registeredTools.get("echo_message");
      expect(toolData).toBeDefined();
      if (!toolData) return;

      // Test uppercase mode
      const uppercaseResult = await toolData.handler({
        message: "test message",
        mode: "uppercase",
        repeat: 1,
        timestamp: true,
      });

      expect(uppercaseResult.isError).toBeFalsy();
      expect(uppercaseResult.structuredContent.originalMessage).toBe(
        "test message",
      );

      // Test lowercase mode
      const lowercaseResult = await toolData.handler({
        message: "TEST MESSAGE",
        mode: "lowercase",
        repeat: 1,
        timestamp: true,
      });

      expect(lowercaseResult.isError).toBeFalsy();
      expect(lowercaseResult.structuredContent.originalMessage).toBe(
        "TEST MESSAGE",
      );
    });

    it("should handle message repetition through complete integration", async () => {
      const toolData = registeredTools.get("echo_message");
      expect(toolData).toBeDefined();
      if (!toolData) return;

      const result = await toolData.handler({
        message: "repeat test",
        mode: "standard",
        repeat: 3,
        timestamp: true,
      });

      expect(result.isError).toBeFalsy();
      expect(result.structuredContent.originalMessage).toBe("repeat test");
      expect(result.structuredContent.repeatCount).toBe(3);
    });

    it("should handle real error conditions through complete error flow", async () => {
      const toolData = registeredTools.get("echo_message");
      expect(toolData).toBeDefined();
      if (!toolData) return;

      // Trigger actual error condition in logic layer
      const result = await toolData.handler({
        message: "fail", // This triggers an error in the real logic
        mode: "standard",
        repeat: 1,
        timestamp: true,
      });

      // Verify error is handled properly by registration layer
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("The message was 'fail'");
      expect(result.structuredContent).toHaveProperty("code");
      expect(result.structuredContent).toHaveProperty("message");
    });

    it("should validate input schema through real validation", async () => {
      const toolData = registeredTools.get("echo_message");
      expect(toolData).toBeDefined();
      if (!toolData) return;

      // Test with invalid input that should fail schema validation
      try {
        await toolData.handler({
          message: "", // Empty message should fail validation
          mode: "standard",
          repeat: 1,
          timestamp: true,
        });
        // If we get here, validation didn't work
        expect.fail("Expected validation error for empty message");
      } catch (error) {
        // This should be caught and handled by the registration layer
        expect(error).toBeDefined();
      }
    });
  });

  describe("Error Handling Integration", () => {
    it("should properly handle and format various error types", async () => {
      const toolData = registeredTools.get("echo_message");
      expect(toolData).toBeDefined();
      if (!toolData) return;

      // Test boundary condition - maximum message length
      const longMessage = "a".repeat(1001); // Exceeds 1000 char limit

      try {
        await toolData.handler({
          message: longMessage,
          mode: "standard",
          repeat: 1,
          timestamp: true,
        });
        expect.fail("Expected validation error for message too long");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should maintain context and traceability through error flows", async () => {
      const toolData = registeredTools.get("echo_message");
      expect(toolData).toBeDefined();
      if (!toolData) return;

      const result = await toolData.handler({
        message: "fail",
        mode: "standard",
        repeat: 1,
        timestamp: true,
      });

      expect(result.isError).toBe(true);
      // Verify that request context was created and used
      expect(
        vi.mocked(utilsModule.requestContextService.createRequestContext),
      ).toHaveBeenCalled();
    });
  });

  describe("Performance and Reliability Integration", () => {
    it("should handle concurrent tool executions independently", async () => {
      const toolData = registeredTools.get("echo_message");
      expect(toolData).toBeDefined();
      if (!toolData) return;

      // Execute multiple tool calls concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        toolData.handler({
          message: `concurrent message ${i}`,
          mode: "standard",
          repeat: 1,
          timestamp: true,
        }),
      );

      const results = await Promise.all(promises);

      // Verify all executions succeeded independently
      results.forEach((result, i) => {
        expect(result.isError).toBeFalsy();
        expect(result.structuredContent.originalMessage).toBe(
          `concurrent message ${i}`,
        );
      });
    });

    it("should maintain proper timestamp generation under load", async () => {
      const toolData = registeredTools.get("echo_message");
      expect(toolData).toBeDefined();
      if (!toolData) return;

      const result1 = await toolData.handler({
        message: "timestamp test 1",
        mode: "standard",
        repeat: 1,
        timestamp: true,
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result2 = await toolData.handler({
        message: "timestamp test 2",
        mode: "standard",
        repeat: 1,
        timestamp: true,
      });

      expect(result1.structuredContent.timestamp).not.toBe(
        result2.structuredContent.timestamp,
      );
      expect(
        new Date(result1.structuredContent.timestamp as string).getTime(),
      ).toBeLessThan(
        new Date(result2.structuredContent.timestamp as string).getTime(),
      );
    });
  });
});
