/**
 * @fileoverview Snapshot tests for resource JSON Schema output.
 * Guards against unintentional schema changes that could break MCP clients.
 * @module tests/mcp-server/resources/schemas/schema-snapshots
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { allResourceDefinitions } from '@/mcp-server/resources/definitions/index.js';

describe('Resource Schema Snapshots', () => {
  for (const resource of allResourceDefinitions) {
    describe(`Resource: ${resource.name}`, () => {
      if (resource.params) {
        it('params JSON output should be stable', () => {
          const jsonSchema = z.toJSONSchema(resource.params!, {
            target: 'draft-7',
          });
          expect(jsonSchema).toMatchSnapshot();
        });
      }

      if (resource.output) {
        it('output JSON output should be stable', () => {
          const jsonSchema = z.toJSONSchema(resource.output!, {
            target: 'draft-7',
          });
          expect(jsonSchema).toMatchSnapshot();
        });
      }
    });
  }
});
