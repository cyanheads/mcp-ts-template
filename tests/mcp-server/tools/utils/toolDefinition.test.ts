/**
 * @fileoverview Test suite for tool definition types and utilities
 * @module tests/mcp-server/tools/utils/toolDefinition.test
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type {
  ToolAnnotations,
  ToolDefinition,
} from '@/mcp-server/tools/utils/toolDefinition.js';

describe('ToolDefinition', () => {
  it('should allow creating a well-typed tool definition', () => {
    const inputSchema = z.object({
      message: z.string().describe('The message'),
    });
    const outputSchema = z.object({
      result: z.string().describe('The result'),
    });

    const definition: ToolDefinition<typeof inputSchema, typeof outputSchema> =
      {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema,
        outputSchema,
        logic: async (input) => ({ result: input.message }),
      };

    expect(definition.name).toBe('test_tool');
    expect(definition.description).toBe('A test tool');
    expect(typeof definition.logic).toBe('function');
  });

  it('should support optional annotations', () => {
    const annotations: ToolAnnotations = {
      title: 'Test Tool',
      readOnlyHint: true,
      openWorldHint: false,
    };

    expect(annotations.title).toBe('Test Tool');
    expect(annotations.readOnlyHint).toBe(true);
    expect(annotations.openWorldHint).toBe(false);
  });

  it('should support annotations with arbitrary keys via index signature', () => {
    const annotations: ToolAnnotations = {
      readOnlyHint: true,
      customProperty: 'custom-value',
    };

    expect(annotations['customProperty']).toBe('custom-value');
  });

  it('should allow optional title and _meta on tool definition', () => {
    const inputSchema = z.object({});
    const outputSchema = z.object({
      ok: z.boolean().describe('Success'),
    });

    const definition: ToolDefinition<typeof inputSchema, typeof outputSchema> =
      {
        name: 'meta_tool',
        title: 'Meta Tool',
        description: 'Tool with meta',
        inputSchema,
        outputSchema,
        logic: async () => ({ ok: true }),
        _meta: { 'io.modelcontextprotocol/ui': { resourceUri: 'test://ui' } },
      };

    expect(definition.title).toBe('Meta Tool');
    expect(definition._meta).toBeDefined();
  });

  it('should allow optional responseFormatter', () => {
    const inputSchema = z.object({});
    const outputSchema = z.object({
      text: z.string().describe('Output text'),
    });

    const definition: ToolDefinition<typeof inputSchema, typeof outputSchema> =
      {
        name: 'formatted_tool',
        description: 'Tool with formatter',
        inputSchema,
        outputSchema,
        logic: async () => ({ text: 'hello' }),
        responseFormatter: (result) => [
          { type: 'text' as const, text: result.text },
        ],
      };

    expect(definition.responseFormatter).toBeDefined();
    const blocks = definition.responseFormatter!({ text: 'hello' });
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: 'text', text: 'hello' });
  });
});
