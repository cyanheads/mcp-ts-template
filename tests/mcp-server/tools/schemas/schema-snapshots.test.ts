/**
 * @fileoverview Snapshot tests for tool JSON Schema output.
 * Guards against unintentional schema changes that could break MCP clients.
 * A schema change will fail this test — update the snapshot deliberately.
 * @module tests/mcp-server/tools/schemas/schema-snapshots
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { allToolDefinitions } from '@/mcp-server/tools/definitions/index.js';

/** Extract the input schema from either old or new-style definition. */
function getInputSchema(tool: Record<string, unknown>) {
  return (tool.inputSchema ?? tool.input) as z.ZodTypeAny;
}

/** Extract the output schema from either old or new-style definition. */
function getOutputSchema(tool: Record<string, unknown>) {
  return (tool.outputSchema ?? tool.output) as z.ZodTypeAny | undefined;
}

describe('Tool Schema Snapshots', () => {
  for (const tool of allToolDefinitions) {
    const rawDef = tool as unknown as Record<string, unknown>;
    describe(`Tool: ${tool.name}`, () => {
      it('inputSchema JSON output should be stable', () => {
        const jsonSchema = z.toJSONSchema(getInputSchema(rawDef), {
          target: 'draft-7',
        });
        expect(jsonSchema).toMatchSnapshot();
      });

      const outSchema = getOutputSchema(rawDef);
      if (outSchema) {
        it('outputSchema JSON output should be stable', () => {
          const jsonSchema = z.toJSONSchema(outSchema, {
            target: 'draft-7',
          });
          expect(jsonSchema).toMatchSnapshot();
        });
      }
    });
  }
});
