/**
 * @fileoverview Tests for JSON Schema Draft 4 compatibility
 * @module tests/mcp-server/tools/schemas/json-schema-compatibility.test
 *
 * Ensures tool schemas remain compatible with clients using older JSON Schema
 * draft versions (particularly Draft 4, used by Go-based MCP clients).
 *
 * Key incompatibilities to avoid:
 * - `exclusiveMinimum` as number (Draft 7) vs boolean (Draft 4)
 * - `exclusiveMaximum` as number (Draft 7) vs boolean (Draft 4)
 *
 * Solution: Use `.min(n)` / `.max(n)` instead of `.positive()` / `.negative()`
 * which output `minimum`/`maximum` keywords compatible with all drafts.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { allToolDefinitions } from '@/mcp-server/tools/definitions/index.js';

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

  // Check current level
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

  // Recurse into object properties
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      issues.push(
        ...findDraft7Incompatibilities(prop, path ? `${path}.${key}` : key),
      );
    }
  }

  // Recurse into array items
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

/**
 * Convert a Zod schema to JSON Schema for testing
 */
function toJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  return z.toJSONSchema(schema, { target: 'draft-7' }) as JsonSchema;
}

describe('JSON Schema Draft 4 Compatibility', () => {
  describe('All Tool Schemas', () => {
    it('should not use exclusiveMinimum as number (Draft 7 format)', () => {
      const allIssues: string[] = [];

      for (const tool of allToolDefinitions) {
        const inputSchema = toJsonSchema(tool.inputSchema);

        const inputIssues = findDraft7Incompatibilities(
          inputSchema as JsonSchemaProperty,
        );

        if (inputIssues.length > 0) {
          allIssues.push(
            `Tool "${tool.name}" inputSchema:\n  - ${inputIssues.join('\n  - ')}`,
          );
        }

        // outputSchema is optional (e.g., for task tools)
        if (tool.outputSchema) {
          const outputSchema = toJsonSchema(tool.outputSchema);
          const outputIssues = findDraft7Incompatibilities(
            outputSchema as JsonSchemaProperty,
          );

          if (outputIssues.length > 0) {
            allIssues.push(
              `Tool "${tool.name}" outputSchema:\n  - ${outputIssues.join('\n  - ')}`,
            );
          }
        }
      }

      expect(allIssues, 'Found Draft 7-only JSON Schema features').toEqual([]);
    });

    it('should have all tools registered', () => {
      expect(allToolDefinitions.length).toBeGreaterThan(0);
    });
  });

  describe('Validator Comparison', () => {
    /**
     * These tests demonstrate the difference between Draft 4-compatible
     * and Draft 7-only validators, serving as documentation for maintainers.
     */

    it('.positive() outputs exclusiveMinimum (Draft 7 only - DO NOT USE)', () => {
      const schema = z.object({ val: z.number().positive() });
      const jsonSchema = toJsonSchema(schema);

      const prop = jsonSchema.properties?.val;
      expect(prop?.exclusiveMinimum).toBe(0);
      expect(prop?.minimum).toBeUndefined();
    });

    it('.min(1) outputs minimum (Draft 4 compatible - RECOMMENDED)', () => {
      const schema = z.object({ val: z.number().min(1) });
      const jsonSchema = toJsonSchema(schema);

      const prop = jsonSchema.properties?.val;
      expect(prop?.minimum).toBe(1);
      expect(prop?.exclusiveMinimum).toBeUndefined();
    });

    it('.negative() outputs exclusiveMaximum (Draft 7 only - DO NOT USE)', () => {
      const schema = z.object({ val: z.number().negative() });
      const jsonSchema = toJsonSchema(schema);

      const prop = jsonSchema.properties?.val;
      expect(prop?.exclusiveMaximum).toBe(0);
      expect(prop?.maximum).toBeUndefined();
    });

    it('.max(-1) outputs maximum (Draft 4 compatible - RECOMMENDED)', () => {
      const schema = z.object({ val: z.number().max(-1) });
      const jsonSchema = toJsonSchema(schema);

      const prop = jsonSchema.properties?.val;
      expect(prop?.maximum).toBe(-1);
      expect(prop?.exclusiveMaximum).toBeUndefined();
    });

    it('.nonnegative() outputs minimum: 0 (Draft 4 compatible)', () => {
      const schema = z.object({ val: z.number().nonnegative() });
      const jsonSchema = toJsonSchema(schema);

      const prop = jsonSchema.properties?.val;
      expect(prop?.minimum).toBe(0);
      expect(prop?.exclusiveMinimum).toBeUndefined();
    });

    it('.nonpositive() outputs maximum: 0 (Draft 4 compatible)', () => {
      const schema = z.object({ val: z.number().nonpositive() });
      const jsonSchema = toJsonSchema(schema);

      const prop = jsonSchema.properties?.val;
      expect(prop?.maximum).toBe(0);
      expect(prop?.exclusiveMaximum).toBeUndefined();
    });
  });

  describe('Common Numeric Patterns', () => {
    it('pagination limit pattern should use minimum/maximum', () => {
      // Common pattern for pagination limits
      const LimitSchema = z.number().int().min(1).max(1000).optional();
      const schema = z.object({ limit: LimitSchema });
      const jsonSchema = toJsonSchema(schema);

      const prop = jsonSchema.properties?.limit;
      expect(prop?.type).toBe('integer');
      expect(prop?.minimum).toBe(1);
      expect(prop?.maximum).toBe(1000);
      expect(prop?.exclusiveMinimum).toBeUndefined();
      expect(prop?.exclusiveMaximum).toBeUndefined();
    });

    it('offset/skip pattern should use minimum: 0', () => {
      // Common pattern for pagination offset
      const OffsetSchema = z.number().int().nonnegative().optional();
      const schema = z.object({ offset: OffsetSchema });
      const jsonSchema = toJsonSchema(schema);

      const prop = jsonSchema.properties?.offset;
      expect(prop?.type).toBe('integer');
      expect(prop?.minimum).toBe(0);
      expect(prop?.exclusiveMinimum).toBeUndefined();
    });

    it('depth pattern should use minimum: 1', () => {
      // Common pattern for depth limits (1-based)
      const DepthSchema = z.number().int().min(1).optional();
      const schema = z.object({ depth: DepthSchema });
      const jsonSchema = toJsonSchema(schema);

      const prop = jsonSchema.properties?.depth;
      expect(prop?.type).toBe('integer');
      expect(prop?.minimum).toBe(1);
      expect(prop?.exclusiveMinimum).toBeUndefined();
    });
  });
});

describe('Individual Tool Schema Validation', () => {
  /**
   * Test each tool's schema individually for better error reporting
   */
  for (const tool of allToolDefinitions) {
    describe(`Tool: ${tool.name}`, () => {
      it('inputSchema should be Draft 4 compatible', () => {
        const jsonSchema = toJsonSchema(tool.inputSchema);
        const issues = findDraft7Incompatibilities(
          jsonSchema as JsonSchemaProperty,
        );

        expect(
          issues,
          `inputSchema contains Draft 7-only features:\n${issues.join('\n')}`,
        ).toEqual([]);
      });

      // outputSchema is optional (e.g., for task tools)
      if (tool.outputSchema) {
        it('outputSchema should be Draft 4 compatible', () => {
          const jsonSchema = toJsonSchema(tool.outputSchema!);
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
