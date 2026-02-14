/**
 * @fileoverview Snapshot tests for resource JSON Schema output.
 * Guards against unintentional schema changes that could break MCP clients.
 * @module tests/mcp-server/resources/schemas/schema-snapshots
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { allResourceDefinitions } from '@/mcp-server/resources/definitions/index.js';

describe('Resource Schema Snapshots', () => {
  for (const resource of allResourceDefinitions) {
    describe(`Resource: ${resource.name}`, () => {
      it('paramsSchema JSON output should be stable', () => {
        const jsonSchema = z.toJSONSchema(resource.paramsSchema, {
          target: 'draft-7',
        });
        expect(jsonSchema).toMatchSnapshot();
      });

      if (resource.outputSchema) {
        it('outputSchema JSON output should be stable', () => {
          const jsonSchema = z.toJSONSchema(resource.outputSchema!, {
            target: 'draft-7',
          });
          expect(jsonSchema).toMatchSnapshot();
        });
      }
    });
  }
});
