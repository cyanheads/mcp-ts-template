/**
 * @fileoverview Tests for tool registration system.
 * @module tests/mcp-server/tools/tool-registration.test
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ToolRegistry } from '@/mcp-server/tools/tool-registration.js';
import { tool } from '@/mcp-server/tools/utils/toolDefinition.js';
import type { HandlerFactoryServices } from '@/mcp-server/tools/utils/toolHandlerFactory.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    notice: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    crit: vi.fn(),
    emerg: vi.fn(),
    child: vi.fn(),
  },
}));

vi.mock('@/config/index.js', () => ({
  config: {
    environment: 'testing',
    mcpServerVersion: '1.0.0-test',
    mcpAuthMode: 'none',
    openTelemetry: { serviceName: 'test', serviceVersion: '0.0.0' },
  },
}));

vi.mock('@/utils/internal/logger.js', () => ({
  logger: mockLogger,
  Logger: { getInstance: () => mockLogger },
}));

vi.mock('@/utils/internal/requestContext.js', () => ({
  requestContextService: {
    createRequestContext: vi.fn((opts: any) => ({
      requestId: 'test-req-id',
      timestamp: new Date().toISOString(),
      operation: opts?.operation ?? 'test',
    })),
  },
}));

vi.mock('@/utils/internal/performance.js', () => ({
  measureToolExecution: vi.fn((fn: () => unknown) => fn()),
}));

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const mockStorage = {
  get: vi.fn(async () => null),
  set: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  list: vi.fn(async () => ({ keys: [] })),
  getMany: vi.fn(async () => new Map()),
};

const services: HandlerFactoryServices = {
  logger: mockLogger as any,
  storage: mockStorage as any,
};

describe('ToolRegistry', () => {
  let mockServer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {
      registerTool: vi.fn(() => {}),
    };
  });

  describe('Tool Registration', () => {
    it('should register a single tool successfully', async () => {
      const testTool = tool('test_tool', {
        description: 'A test tool',
        input: z.object({ input: z.string().describe('input') }),
        output: z.object({ output: z.string().describe('output') }),
        handler: (input) => ({ output: input.input.toUpperCase() }),
      });

      const registry = new ToolRegistry([testTool], services);
      await registry.registerAll(mockServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
      const call = mockServer.registerTool.mock.calls[0];
      expect(call[0]).toBe('test_tool');
      expect(call[1].description).toBe('A test tool');
      expect(typeof call[2]).toBe('function');
    });

    it('should register multiple tools', async () => {
      const tool1 = tool('tool_one', {
        description: 'First tool',
        input: z.object({}),
        output: z.object({}),
        handler: () => ({}),
      });

      const tool2 = tool('tool_two', {
        description: 'Second tool',
        input: z.object({}),
        output: z.object({}),
        handler: () => ({}),
      });

      const registry = new ToolRegistry([tool1, tool2], services);
      await registry.registerAll(mockServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    });

    it('should handle empty tool list', async () => {
      const registry = new ToolRegistry([], services);
      await registry.registerAll(mockServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(0);
    });
  });

  describe('Title Derivation', () => {
    it('should use explicit title when provided', async () => {
      const testTool = tool('my_tool', {
        title: 'Custom Title',
        description: 'Test tool',
        input: z.object({}),
        output: z.object({}),
        handler: () => ({}),
      });

      const registry = new ToolRegistry([testTool], services);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].title).toBe('Custom Title');
    });

    it('should use annotation title when no explicit title', async () => {
      const testTool = tool('my_tool', {
        description: 'Test tool',
        input: z.object({}),
        output: z.object({}),
        handler: () => ({}),
        annotations: { title: 'Annotation Title' },
      });

      const registry = new ToolRegistry([testTool], services);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].title).toBe('Annotation Title');
    });

    it('should derive title from name when no title provided', async () => {
      const testTool = tool('echo_message_test', {
        description: 'Test tool',
        input: z.object({}),
        output: z.object({}),
        handler: () => ({}),
      });

      const registry = new ToolRegistry([testTool], services);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].title).toBe('Echo Message Test');
    });

    it('should prefer explicit title over annotation title', async () => {
      const testTool = tool('my_tool', {
        title: 'Explicit Title',
        description: 'Test tool',
        input: z.object({}),
        output: z.object({}),
        handler: () => ({}),
        annotations: { title: 'Annotation Title' },
      });

      const registry = new ToolRegistry([testTool], services);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].title).toBe('Explicit Title');
    });
  });

  describe('Schema Registration', () => {
    it('should register input and output schemas', async () => {
      const testTool = tool('typed_tool', {
        description: 'Tool with schemas',
        input: z.object({
          name: z.string().describe('name'),
          age: z.number().describe('age'),
        }),
        output: z.object({
          greeting: z.string().describe('greeting'),
        }),
        handler: (input) => ({ greeting: `Hello ${input.name}` }),
      });

      const registry = new ToolRegistry([testTool], services);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].inputSchema).toBeDefined();
      expect(call[1].outputSchema).toBeDefined();
      expect(call[1].inputSchema.shape.name).toBeDefined();
      expect(call[1].outputSchema.shape.greeting).toBeDefined();
    });
  });

  describe('Annotations', () => {
    it('should register annotations when provided', async () => {
      const testTool = tool('annotated_tool', {
        description: 'Tool with annotations',
        input: z.object({}),
        output: z.object({}),
        handler: () => ({}),
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          openWorldHint: false,
        },
      });

      const registry = new ToolRegistry([testTool], services);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].annotations).toBeDefined();
      expect(call[1].annotations.readOnlyHint).toBe(true);
      expect(call[1].annotations.idempotentHint).toBe(true);
      expect(call[1].annotations.openWorldHint).toBe(false);
    });

    it('should not include annotations field when none provided', async () => {
      const testTool = tool('plain_tool', {
        description: 'Tool without annotations',
        input: z.object({}),
        output: z.object({}),
        handler: () => ({}),
      });

      const registry = new ToolRegistry([testTool], services);
      await registry.registerAll(mockServer);

      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].annotations).toBeUndefined();
    });
  });

  describe('Handler Creation', () => {
    it('should create handler with custom format', async () => {
      const testTool = tool('formatted_tool', {
        description: 'Tool with formatter',
        input: z.object({}),
        output: z.object({ data: z.string().describe('data') }),
        handler: () => ({ data: 'test' }),
        format: (result) => [{ type: 'text', text: `Custom: ${result.data}` }],
      });

      const registry = new ToolRegistry([testTool], services);
      await registry.registerAll(mockServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
      const handler = mockServer.registerTool.mock.calls[0][2];
      expect(typeof handler).toBe('function');
    });

    it('should create handler without format when not provided', async () => {
      const testTool = tool('plain_tool', {
        description: 'Tool without formatter',
        input: z.object({}),
        output: z.object({}),
        handler: () => ({}),
      });

      const registry = new ToolRegistry([testTool], services);
      await registry.registerAll(mockServer);

      const handler = mockServer.registerTool.mock.calls[0][2];
      expect(typeof handler).toBe('function');
    });
  });

  describe('Registration Order', () => {
    it('should register tools in the order they are provided', async () => {
      const tools = [
        tool('first', {
          description: 'First tool',
          input: z.object({}),
          output: z.object({}),
          handler: () => ({}),
        }),
        tool('second', {
          description: 'Second tool',
          input: z.object({}),
          output: z.object({}),
          handler: () => ({}),
        }),
        tool('third', {
          description: 'Third tool',
          input: z.object({}),
          output: z.object({}),
          handler: () => ({}),
        }),
      ];

      const registry = new ToolRegistry(tools, services);
      await registry.registerAll(mockServer);

      expect(mockServer.registerTool.mock.calls[0][0]).toBe('first');
      expect(mockServer.registerTool.mock.calls[1][0]).toBe('second');
      expect(mockServer.registerTool.mock.calls[2][0]).toBe('third');
    });
  });

  describe('Complex Tools', () => {
    it('should handle tool with complex nested schemas', async () => {
      const complexTool = tool('complex_tool', {
        description: 'Complex tool with nested schemas',
        input: z.object({
          user: z
            .object({
              name: z.string().describe('name'),
              email: z.email().describe('email'),
            })
            .describe('user'),
          settings: z
            .object({
              theme: z.enum(['light', 'dark']).describe('theme'),
              notifications: z.boolean().describe('notifications'),
            })
            .describe('settings'),
        }),
        output: z.object({
          success: z.boolean().describe('success'),
          message: z.string().describe('message'),
        }),
        handler: (input) => ({
          success: true,
          message: `Processed settings for ${input.user.name}`,
        }),
      });

      const registry = new ToolRegistry([complexTool], services);
      await registry.registerAll(mockServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
      const call = mockServer.registerTool.mock.calls[0];
      expect(call[1].inputSchema.shape.user).toBeDefined();
      expect(call[1].inputSchema.shape.settings).toBeDefined();
    });
  });
});
