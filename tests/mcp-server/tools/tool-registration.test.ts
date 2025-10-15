/**
 * @fileoverview Tests for tool registration system.
 * @module tests/mcp-server/tools/tool-registration.test.ts
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ToolRegistry } from '@/mcp-server/tools/tool-registration.js';
import type { ToolDefinition } from '@/mcp-server/tools/utils/toolDefinition.js';
import { z } from 'zod';

describe('ToolRegistry', () => {
  let mockServer: any;
  let registry: ToolRegistry;

  beforeEach(() => {
    // Create a mock MCP server
    mockServer = {
      registerTool: vi.fn(() => {}),
    };
  });

  describe('Tool Registration', () => {
    it('should register a single tool successfully', async () => {
      const testTool: ToolDefinition<any, any> = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: z.object({ input: z.string() }),
        outputSchema: z.object({ output: z.string() }),
        logic: async (input: { input: string }) => ({
          output: input.input.toUpperCase(),
        }),
      };

      registry = new ToolRegistry([testTool]);
      await registry.registerAll(mockServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
      const call = mockServer.registerTool.mock.calls[0];
      expect(call[0]).toBe('test_tool');
      expect(call[1].description).toBe('A test tool');
      expect(typeof call[2]).toBe('function');
    });

    it('should register multiple tools', async () => {
      const tool1: ToolDefinition<any, any> = {
        name: 'tool_one',
        description: 'First tool',
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        logic: async () => ({}),
      };

      const tool2: ToolDefinition<any, any> = {
        name: 'tool_two',
        description: 'Second tool',
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        logic: async () => ({}),
      };

      registry = new ToolRegistry([tool1, tool2]);
      await registry.registerAll(mockServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    });

    it('should handle empty tool list', async () => {
      registry = new ToolRegistry([]);
      await registry.registerAll(mockServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(0);
    });
  });

  describe('Title Derivation', () => {
    it('should use explicit title when provided', async () => {
      const toolWithTitle: ToolDefinition<any, any> = {
        name: 'my_tool',
        title: 'Custom Title',
        description: 'Test tool',
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        logic: async () => ({}),
      };

      registry = new ToolRegistry([toolWithTitle]);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].title).toBe('Custom Title');
    });

    it('should use annotation title when no explicit title', async () => {
      const toolWithAnnotationTitle: ToolDefinition<any, any> = {
        name: 'my_tool',
        description: 'Test tool',
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        logic: async () => ({}),
        annotations: {
          title: 'Annotation Title',
        },
      };

      registry = new ToolRegistry([toolWithAnnotationTitle]);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].title).toBe('Annotation Title');
    });

    it('should derive title from name when no title provided', async () => {
      const toolWithoutTitle: ToolDefinition<any, any> = {
        name: 'echo_message_test',
        description: 'Test tool',
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        logic: async () => ({}),
      };

      registry = new ToolRegistry([toolWithoutTitle]);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      // Should convert snake_case to Title Case
      expect(call[1].title).toBe('Echo Message Test');
    });

    it('should prefer explicit title over annotation title', async () => {
      const tool: ToolDefinition<any, any> = {
        name: 'my_tool',
        title: 'Explicit Title',
        description: 'Test tool',
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        logic: async () => ({}),
        annotations: {
          title: 'Annotation Title',
        },
      };

      registry = new ToolRegistry([tool]);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].title).toBe('Explicit Title');
    });
  });

  describe('Schema Registration', () => {
    it('should register input and output schemas', async () => {
      const tool: ToolDefinition<any, any> = {
        name: 'typed_tool',
        description: 'Tool with schemas',
        inputSchema: z.object({
          name: z.string(),
          age: z.number(),
        }),
        outputSchema: z.object({
          greeting: z.string(),
        }),
        logic: async (input) => ({ greeting: `Hello ${input.name}` }),
      };

      registry = new ToolRegistry([tool]);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].inputSchema).toBeDefined();
      expect(call[1].outputSchema).toBeDefined();
      expect(call[1].inputSchema.name).toBeDefined();
      expect(call[1].outputSchema.greeting).toBeDefined();
    });
  });

  describe('Annotations', () => {
    it('should register annotations when provided', async () => {
      const toolWithAnnotations: ToolDefinition<any, any> = {
        name: 'annotated_tool',
        description: 'Tool with annotations',
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        logic: async () => ({}),
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          openWorldHint: false,
        },
      };

      registry = new ToolRegistry([toolWithAnnotations]);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].annotations).toBeDefined();
      expect(call[1].annotations.readOnlyHint).toBe(true);
      expect(call[1].annotations.idempotentHint).toBe(true);
      expect(call[1].annotations.openWorldHint).toBe(false);
    });

    it('should not include annotations field when none provided', async () => {
      const toolWithoutAnnotations: ToolDefinition<any, any> = {
        name: 'plain_tool',
        description: 'Tool without annotations',
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        logic: async () => ({}),
      };

      registry = new ToolRegistry([toolWithoutAnnotations]);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].annotations).toBeUndefined();
    });
  });

  describe('Handler Creation', () => {
    it('should create handler with custom response formatter', async () => {
      const customFormatter = (result: { data: string }) => [
        { type: 'text' as const, text: `Custom: ${result.data}` },
      ];

      const tool: ToolDefinition<any, any> = {
        name: 'formatted_tool',
        description: 'Tool with formatter',
        inputSchema: z.object({}),
        outputSchema: z.object({ data: z.string() }),
        logic: async () => ({ data: 'test' }),
        responseFormatter: customFormatter,
      };

      registry = new ToolRegistry([tool]);
      await registry.registerAll(mockServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
      const handler = mockServer.registerTool.mock.calls[0][2];
      expect(typeof handler).toBe('function');
    });

    it('should create handler without formatter when not provided', async () => {
      const tool: ToolDefinition<any, any> = {
        name: 'plain_tool',
        description: 'Tool without formatter',
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        logic: async () => ({}),
      };

      registry = new ToolRegistry([tool]);
      await registry.registerAll(mockServer);

      const handler = mockServer.registerTool.mock.calls[0][2];
      expect(typeof handler).toBe('function');
    });
  });

  describe('Registration Order', () => {
    it('should register tools in the order they are provided', async () => {
      const tools: ToolDefinition<any, any>[] = [
        {
          name: 'first',
          description: 'First tool',
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          logic: async () => ({}),
        },
        {
          name: 'second',
          description: 'Second tool',
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          logic: async () => ({}),
        },
        {
          name: 'third',
          description: 'Third tool',
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          logic: async () => ({}),
        },
      ];

      registry = new ToolRegistry(tools);
      await registry.registerAll(mockServer);

      expect(mockServer.registerTool.mock.calls[0][0]).toBe('first');
      expect(mockServer.registerTool.mock.calls[1][0]).toBe('second');
      expect(mockServer.registerTool.mock.calls[2][0]).toBe('third');
    });
  });

  describe('Complex Tools', () => {
    it('should handle tool with complex nested schemas', async () => {
      const complexTool: ToolDefinition<any, any> = {
        name: 'complex_tool',
        description: 'Complex tool with nested schemas',
        inputSchema: z.object({
          user: z.object({
            name: z.string(),
            email: z.string().email(),
          }),
          settings: z.object({
            theme: z.enum(['light', 'dark']),
            notifications: z.boolean(),
          }),
        }),
        outputSchema: z.object({
          success: z.boolean(),
          message: z.string(),
        }),
        logic: async (input) => ({
          success: true,
          message: `Processed settings for ${input.user.name}`,
        }),
      };

      registry = new ToolRegistry([complexTool]);
      await registry.registerAll(mockServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].inputSchema.user).toBeDefined();
      expect(call[1].inputSchema.settings).toBeDefined();
    });
  });
});
