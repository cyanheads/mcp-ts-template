/**
 * @fileoverview Snapshot tests for tool JSON Schema output.
 * Guards against unintentional schema changes that could break MCP clients.
 * A schema change will fail this test — update the snapshot deliberately.
 * @module tests/mcp-server/tools/schemas/schema-snapshots
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { allToolDefinitions } from '@/mcp-server/tools/definitions/index.js';

describe('Tool Schema Snapshots', () => {
  for (const tool of allToolDefinitions) {
    describe(`Tool: ${tool.name}`, () => {
      it('inputSchema JSON output should be stable', () => {
        const jsonSchema = z.toJSONSchema(tool.inputSchema, {
          target: 'draft-7',
        });
        expect(jsonSchema).toMatchSnapshot();
      });

      if (tool.outputSchema) {
        it('outputSchema JSON output should be stable', () => {
          const jsonSchema = z.toJSONSchema(tool.outputSchema!, {
            target: 'draft-7',
          });
          expect(jsonSchema).toMatchSnapshot();
        });
      }
    });
  }
});
