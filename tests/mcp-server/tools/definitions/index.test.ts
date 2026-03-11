/**
 * @fileoverview Tests for tool definitions barrel export.
 * Validates that all registered tools have required metadata and unique names.
 * Handles both legacy (inputSchema/logic) and new-style (input/handler) definitions.
 * @module tests/mcp-server/tools/definitions/index
 */
import { describe, expect, it } from 'vitest';

import { allToolDefinitions } from '@/mcp-server/tools/definitions/index.js';

/** Extract the input schema from either old or new-style definition. */
function getInputSchema(tool: Record<string, unknown>) {
  return tool.inputSchema ?? tool.input;
}

describe('Tool Definitions Barrel Export', () => {
  it('should export a non-empty array of tool definitions', () => {
    expect(allToolDefinitions).toBeInstanceOf(Array);
    expect(allToolDefinitions.length).toBeGreaterThan(0);
  });

  it('should have unique tool names', () => {
    const names = allToolDefinitions.map((t) => t.name);
    const uniqueNames = new Set(names);

    expect(uniqueNames.size).toBe(names.length);
  });

  for (const tool of allToolDefinitions) {
    describe(`Tool: ${tool.name}`, () => {
      it('should have required metadata', () => {
        expect(tool.name).toBeTruthy();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeTruthy();
        expect(typeof tool.description).toBe('string');
      });

      it('should have valid input schema', () => {
        const schema = getInputSchema(tool as unknown as Record<string, unknown>);
        expect(schema).toBeDefined();
        expect(typeof (schema as { parse: unknown }).parse).toBe('function');
      });

      it('should have logic, handler, or taskHandlers', () => {
        const def = tool as unknown as Record<string, unknown>;
        const hasLogic = typeof def.logic === 'function';
        const hasHandler = typeof def.handler === 'function';
        const hasTaskHandlers =
          'taskHandlers' in def &&
          def.taskHandlers !== null &&
          typeof def.taskHandlers === 'object';

        expect(hasLogic || hasHandler || hasTaskHandlers).toBe(true);
      });
    });
  }
});
