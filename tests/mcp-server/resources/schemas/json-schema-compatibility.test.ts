/**
 * @fileoverview Tests for Resource JSON Schema Draft 4 compatibility
 * @module tests/mcp-server/resources/schemas/json-schema-compatibility.test
 *
 * Ensures resource schemas remain compatible with clients using older JSON Schema
 * draft versions (particularly Draft 4, used by Go-based MCP clients).
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { allResourceDefinitions } from '@/mcp-server/resources/definitions/index.js';

type JsonSchemaProperty = {
  type?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  properties?: Record<string, JsonSchemaProperty>;
  items?: JsonSchemaProperty;
  [key: string]: unknown;
};

type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  [key: string]: unknown;
};

/**
 * Recursively find all properties in a JSON Schema that have Draft 7-only
 * numeric exclusiveMinimum or exclusiveMaximum values.
 */
function findDraft7Incompatibilities(
  schema: JsonSchemaProperty,
  path: string = '',
): string[] {
  const issues: string[] = [];

  if (typeof schema.exclusiveMinimum === 'number') {
    issues.push(
      `${path || 'root'}: exclusiveMinimum is number (${schema.exclusiveMinimum}) - use .min() instead of .positive()`,
    );
  }
  if (typeof schema.exclusiveMaximum === 'number') {
    issues.push(
      `${path || 'root'}: exclusiveMaximum is number (${schema.exclusiveMaximum}) - use .max() instead of .negative()`,
    );
  }

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      issues.push(
        ...findDraft7Incompatibilities(prop, path ? `${path}.${key}` : key),
      );
    }
  }

  if (schema.items && typeof schema.items === 'object') {
    issues.push(
      ...findDraft7Incompatibilities(
        schema.items as JsonSchemaProperty,
        `${path}[]`,
      ),
    );
  }

  return issues;
}

function toJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  return z.toJSONSchema(schema, { target: 'draft-7' }) as JsonSchema;
}

describe('Resource JSON Schema Draft 4 Compatibility', () => {
  describe('All Resource Schemas', () => {
    it('should not use exclusiveMinimum as number (Draft 7 format)', () => {
      const allIssues: string[] = [];

      for (const resource of allResourceDefinitions) {
        const paramsSchema = toJsonSchema(resource.paramsSchema);
        const paramsIssues = findDraft7Incompatibilities(
          paramsSchema as JsonSchemaProperty,
        );

        if (paramsIssues.length > 0) {
          allIssues.push(
            `Resource "${resource.name}" paramsSchema:\n  - ${paramsIssues.join('\n  - ')}`,
          );
        }

        // Test output schema if defined
        if (resource.outputSchema) {
          const outputSchema = toJsonSchema(resource.outputSchema);
          const outputIssues = findDraft7Incompatibilities(
            outputSchema as JsonSchemaProperty,
          );

          if (outputIssues.length > 0) {
            allIssues.push(
              `Resource "${resource.name}" outputSchema:\n  - ${outputIssues.join('\n  - ')}`,
            );
          }
        }
      }

      expect(allIssues, 'Found Draft 7-only JSON Schema features').toEqual([]);
    });

    it('should have all resources registered', () => {
      expect(allResourceDefinitions.length).toBeGreaterThan(0);
    });
  });
});

describe('Individual Resource Schema Validation', () => {
  for (const resource of allResourceDefinitions) {
    describe(`Resource: ${resource.name}`, () => {
      it('paramsSchema should be Draft 4 compatible', () => {
        const jsonSchema = toJsonSchema(resource.paramsSchema);
        const issues = findDraft7Incompatibilities(
          jsonSchema as JsonSchemaProperty,
        );

        expect(
          issues,
          `paramsSchema contains Draft 7-only features:\n${issues.join('\n')}`,
        ).toEqual([]);
      });

      if (resource.outputSchema) {
        it('outputSchema should be Draft 4 compatible', () => {
          const jsonSchema = toJsonSchema(resource.outputSchema!);
          const issues = findDraft7Incompatibilities(
            jsonSchema as JsonSchemaProperty,
          );

          expect(
            issues,
            `outputSchema contains Draft 7-only features:\n${issues.join('\n')}`,
          ).toEqual([]);
        });
      }
    });
  }
});
