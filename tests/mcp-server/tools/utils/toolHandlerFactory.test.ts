/**
 * @fileoverview Tests for the MCP tool handler factory.
 * @module tests/mcp-server/tools/utils/toolHandlerFactory.test.ts
 */
import { describe, expect, it } from 'vitest';
import { createMcpToolHandler } from '@/mcp-server/tools/utils/toolHandlerFactory.js';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import type { RequestContext } from '@/utils/index.js';

describe('createMcpToolHandler', () => {
  describe('Basic Functionality', () => {
    it('should create a handler that executes logic and returns structured content', async () => {
      const mockLogic = async (
        input: { message: string },
        _context: RequestContext,
        _sdkContext: Record<string, unknown>,
      ) => {
        return { echo: input.message, processed: true };
      };

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const result = await handler({ message: 'hello' }, {});

      expect(result.structuredContent).toEqual({
        echo: 'hello',
        processed: true,
      });
      expect(result.content).toHaveLength(1);
      expect(result.content![0]!.type).toBe('text');
      expect(result.isError).toBeUndefined();
    });

    it('should use default response formatter when none provided', async () => {
      const mockLogic = async () => ({ result: 'success' });

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const result = await handler({}, {});

      expect(result.content![0]!.type).toBe('text');
      const text = result.content![0]!.text;
      expect(text).toContain('"result"');
      expect(text).toContain('"success"');
    });

    it('should use custom response formatter when provided', async () => {
      const mockLogic = async () => ({ data: 'custom' });
      const customFormatter = (result: { data: string }) => [
        { type: 'text' as const, text: `Custom: ${result.data}` },
      ];

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
        responseFormatter: customFormatter,
      });

      const result = await handler({}, {});

      expect(result.content![0]!.text).toBe('Custom: custom');
    });
  });

  describe('Context Handling', () => {
    it('should extract sessionId from SDK context when present', async () => {
      let capturedContext: RequestContext | undefined;

      const mockLogic = async (
        _input: unknown,
        context: RequestContext,
        _sdkContext: Record<string, unknown>,
      ) => {
        capturedContext = context;
        return { success: true };
      };

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const sdkContext = {
        sessionId: 'test-session-123',
      };

      await handler({}, sdkContext);

      expect(capturedContext).toBeDefined();
      expect(capturedContext!.requestId).toBeDefined();
    });

    it('should handle missing sessionId gracefully', async () => {
      const mockLogic = async () => ({ success: true });

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const result = await handler({}, {});

      expect(result.structuredContent).toEqual({ success: true });
    });

    it('should pass both appContext and sdkContext to logic function', async () => {
      let capturedAppContext: RequestContext | undefined;
      let capturedSdkContext: Record<string, unknown> | undefined;

      const mockLogic = async (
        _input: unknown,
        appContext: RequestContext,
        sdkContext: Record<string, unknown>,
      ) => {
        capturedAppContext = appContext;
        capturedSdkContext = sdkContext;
        return { success: true };
      };

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const testSdkContext = {
        sessionId: 'test-session',
      };

      await handler({ test: 'input' }, testSdkContext);

      expect(capturedAppContext).toBeDefined();
      expect(capturedAppContext!.operation).toBe('HandleToolRequest');
      expect(capturedSdkContext).toEqual(testSdkContext);
    });
  });

  describe('Elicitation Support', () => {
    it('should add elicitInput to appContext when SDK supports it', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedContext: any;

      const mockLogic = async (
        _input: unknown,
        context: RequestContext,
        _sdkContext: Record<string, unknown>,
      ) => {
        capturedContext = context;
        return { success: true };
      };

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const mockElicitInput = async (args: {
        message: string;
        schema: unknown;
      }) => {
        return { elicited: args.message };
      };

      const sdkContext = {
        elicitInput: mockElicitInput,
      };

      await handler({}, sdkContext);

      expect(capturedContext).toBeDefined();
      expect('elicitInput' in capturedContext).toBe(true);
      expect(typeof capturedContext.elicitInput).toBe('function');
    });

    it('should not add elicitInput when SDK does not support it', async () => {
      let capturedContext: RequestContext | undefined;

      const mockLogic = async (
        _input: unknown,
        context: RequestContext,
        _sdkContext: Record<string, unknown>,
      ) => {
        capturedContext = context;
        return { success: true };
      };

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      await handler({}, {});

      expect(capturedContext).toBeDefined();
      expect('elicitInput' in capturedContext!).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should catch and format McpError correctly', async () => {
      const mockLogic = async () => {
        throw new McpError(
          JsonRpcErrorCode.InvalidParams,
          'Test error message',
          { detail: 'Additional info' },
        );
      };

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const result = await handler({}, {});

      expect(result.isError).toBe(true);
      expect(result.content![0]!.type).toBe('text');
      expect(result.content![0]!.text).toContain('Test error message');
      expect(result.structuredContent).toMatchObject({
        code: JsonRpcErrorCode.InvalidParams,
        message: 'Test error message',
      });
    });

    it('should convert generic errors to McpError', async () => {
      const mockLogic = async () => {
        throw new Error('Generic error');
      };

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const result = await handler({}, {});

      expect(result.isError).toBe(true);
      expect(result.content![0]!.text).toContain('Error:');
      expect(result.structuredContent!.code).toBeDefined();
      expect(result.structuredContent!.message).toBeDefined();
    });

    it('should handle errors with input context for debugging', async () => {
      const mockLogic = async () => {
        throw new McpError(JsonRpcErrorCode.InternalError, 'Processing failed');
      };

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const result = await handler({ userId: 123, action: 'test' }, {});

      expect(result.isError).toBe(true);
      expect(result.structuredContent!.code).toBe(
        JsonRpcErrorCode.InternalError,
      );
    });

    it('should preserve error data in structured content', async () => {
      const errorData = {
        field: 'email',
        constraint: 'format',
        providedValue: 'invalid-email',
      };

      const mockLogic = async () => {
        throw new McpError(
          JsonRpcErrorCode.ValidationError,
          'Validation failed',
          errorData,
        );
      };

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const result = await handler({}, {});

      expect(result.isError).toBe(true);
      expect(result.structuredContent!.data).toBeDefined();
    });
  });

  describe('Performance Measurement Integration', () => {
    it('should successfully complete measureToolExecution', async () => {
      const mockLogic = async () => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { result: 'success' };
      };

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const result = await handler({}, {});

      expect(result.structuredContent).toEqual({ result: 'success' });
      expect(result.isError).toBeUndefined();
    });

    it('should measure execution even when errors occur', async () => {
      const mockLogic = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Measured error');
      };

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const result = await handler({}, {});

      expect(result.isError).toBe(true);
    });
  });

  describe('Input and Tool Name Tracking', () => {
    it('should include tool name in operation context', async () => {
      let capturedContext: RequestContext | undefined;

      const mockLogic = async (
        _input: unknown,
        context: RequestContext,
        _sdkContext: Record<string, unknown>,
      ) => {
        capturedContext = context;
        return { success: true };
      };

      const handler = createMcpToolHandler({
        toolName: 'my_custom_tool',
        logic: mockLogic,
      });

      await handler({}, {});

      expect(capturedContext).toBeDefined();
      expect(capturedContext!.operation).toBe('HandleToolRequest');
    });

    it('should include input in additional context', async () => {
      const mockLogic = async () => ({ success: true });

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const testInput = { userId: 'user-123', action: 'test' };

      const result = await handler(testInput, {});

      expect(result.structuredContent).toEqual({ success: true });
    });
  });

  describe('Response Structure', () => {
    it('should return both structuredContent and content fields', async () => {
      const mockLogic = async () => ({ key: 'value' });

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
      });

      const result = await handler({}, {});

      expect(result).toHaveProperty('structuredContent');
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should format content as ContentBlock array', async () => {
      const mockLogic = async () => ({ data: 'test' });
      const formatter = (result: { data: string }) => [
        { type: 'text' as const, text: result.data },
        { type: 'text' as const, text: 'Additional info' },
      ];

      const handler = createMcpToolHandler({
        toolName: 'test_tool',
        logic: mockLogic,
        responseFormatter: formatter,
      });

      const result = await handler({}, {});

      expect(result.content).toHaveLength(2);
      expect(result.content![0]!.type).toBe('text');
      expect(result.content![1]!.type).toBe('text');
    });
  });
});
