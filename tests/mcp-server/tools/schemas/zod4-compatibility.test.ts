/**
 * @fileoverview Tests for Zod 4 compatibility and migration safeguards
 * @module tests/mcp-server/tools/schemas/zod4-compatibility.test
 *
 * Ensures the codebase follows Zod 4 best practices and avoids patterns
 * that could break with the Zod 4 upgrade from Zod 3.x.
 *
 * Key Zod 4 changes:
 * - z.record() now requires two arguments: z.record(keySchema, valueSchema)
 * - Some type inference changes in complex schemas
 * - New z.toJSONSchema() API for JSON Schema generation
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Zod 4 Compatibility', () => {
  describe('z.record() Usage', () => {
    /**
     * In Zod 4, z.record() requires two arguments.
     * Zod 3: z.record(valueSchema) - key was implicitly string
     * Zod 4: z.record(keySchema, valueSchema) - key must be explicit
     */

    it('z.record() with two arguments works correctly', () => {
      const schema = z.record(z.string(), z.number());

      expect(schema.safeParse({ a: 1, b: 2 }).success).toBe(true);
      expect(schema.safeParse({ a: 'not a number' }).success).toBe(false);
      expect(schema.safeParse({ 123: 1 }).success).toBe(true); // keys coerced to strings
    });

    it('z.record() produces valid JSON Schema', () => {
      const schema = z.object({
        metadata: z.record(z.string(), z.any()).optional(),
      });

      const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7' });

      expect(jsonSchema).toBeDefined();
      expect(jsonSchema.type).toBe('object');
    });

    it('z.record() with complex value types', () => {
      const schema = z.record(
        z.string(),
        z.object({
          enabled: z.boolean(),
          value: z.number().optional(),
        }),
      );

      const validData = {
        feature1: { enabled: true, value: 42 },
        feature2: { enabled: false },
      };

      expect(schema.safeParse(validData).success).toBe(true);
    });
  });

  describe('z.toJSONSchema() API', () => {
    /**
     * Zod 4 introduces z.toJSONSchema() as the standard way to convert
     * Zod schemas to JSON Schema format.
     */

    it('should convert simple object schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().int().min(0),
      });

      const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7' });

      expect(jsonSchema.$schema).toBe(
        'http://json-schema.org/draft-07/schema#',
      );
      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toHaveProperty('name');
      expect(jsonSchema.properties).toHaveProperty('age');
    });

    it('should handle optional fields', () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7' });

      expect(jsonSchema.required).toContain('required');
      expect(jsonSchema.required).not.toContain('optional');
    });

    it('should handle enum types', () => {
      const schema = z.object({
        status: z.enum(['active', 'inactive', 'pending']),
      });

      const jsonSchema = z.toJSONSchema(schema, {
        target: 'draft-7',
      }) as Record<string, any>;

      expect(jsonSchema.properties.status.enum).toEqual([
        'active',
        'inactive',
        'pending',
      ]);
    });

    it('should handle array types', () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const jsonSchema = z.toJSONSchema(schema, {
        target: 'draft-7',
      }) as Record<string, any>;

      expect(jsonSchema.properties.tags.type).toBe('array');
      expect(jsonSchema.properties.tags.items.type).toBe('string');
    });

    it('should preserve descriptions', () => {
      const schema = z.object({
        name: z.string().describe('The user name'),
        count: z.number().describe('Number of items'),
      });

      const jsonSchema = z.toJSONSchema(schema, {
        target: 'draft-7',
      }) as Record<string, any>;

      expect(jsonSchema.properties.name.description).toBe('The user name');
      expect(jsonSchema.properties.count.description).toBe('Number of items');
    });
  });

  describe('Type Inference', () => {
    /**
     * Zod 4 has improved type inference. These tests ensure our patterns
     * work correctly with the new type system.
     */

    it('should infer types correctly from z.infer', () => {
      const schema = z.object({
        id: z.string(),
        count: z.number(),
        active: z.boolean(),
        tags: z.array(z.string()),
        metadata: z.record(z.string(), z.unknown()).optional(),
      });

      type SchemaType = z.infer<typeof schema>;

      // This is a compile-time check - if types are wrong, TS will error
      const validData: SchemaType = {
        id: 'test',
        count: 42,
        active: true,
        tags: ['a', 'b'],
        metadata: { key: 'value' },
      };

      expect(schema.safeParse(validData).success).toBe(true);
    });

    it('should handle discriminated unions', () => {
      const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('text'), content: z.string() }),
        z.object({ type: z.literal('image'), url: z.string().url() }),
      ]);

      expect(schema.safeParse({ type: 'text', content: 'hello' }).success).toBe(
        true,
      );
      expect(
        schema.safeParse({ type: 'image', url: 'https://example.com/img.png' })
          .success,
      ).toBe(true);
      expect(schema.safeParse({ type: 'unknown' }).success).toBe(false);
    });

    it('should handle nullable vs optional correctly', () => {
      const schema = z.object({
        nullable: z.string().nullable(), // can be string or null
        optional: z.string().optional(), // can be string or undefined
        nullish: z.string().nullish(), // can be string, null, or undefined
      });

      expect(
        schema.safeParse({
          nullable: null,
          optional: undefined,
          nullish: null,
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          nullable: 'value',
        }).success,
      ).toBe(true);
    });
  });

  describe('Schema Composition', () => {
    /**
     * Test that schema composition patterns work correctly in Zod 4
     */

    it('should handle .extend() correctly', () => {
      const baseSchema = z.object({
        id: z.string(),
        createdAt: z.string().datetime(),
      });

      const extendedSchema = baseSchema.extend({
        name: z.string(),
        email: z.string().email(),
      });

      const validData = {
        id: '123',
        createdAt: new Date().toISOString(),
        name: 'Test',
        email: 'test@example.com',
      };

      expect(extendedSchema.safeParse(validData).success).toBe(true);
    });

    it('should handle .merge() correctly', () => {
      const schema1 = z.object({ a: z.string() });
      const schema2 = z.object({ b: z.number() });

      const merged = schema1.merge(schema2);

      expect(merged.safeParse({ a: 'test', b: 42 }).success).toBe(true);
      expect(merged.safeParse({ a: 'test' }).success).toBe(false);
    });

    it('should handle .pick() and .omit() correctly', () => {
      const fullSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        password: z.string(),
      });

      const publicSchema = fullSchema.omit({ password: true });
      const idOnlySchema = fullSchema.pick({ id: true });

      expect(
        publicSchema.safeParse({ id: '1', name: 'Test', email: 'a@b.com' })
          .success,
      ).toBe(true);
      expect(idOnlySchema.safeParse({ id: '1' }).success).toBe(true);
    });

    it('should handle .partial() correctly', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const partialSchema = schema.partial();

      expect(partialSchema.safeParse({}).success).toBe(true);
      expect(partialSchema.safeParse({ name: 'Test' }).success).toBe(true);
    });
  });

  describe('Refinements and Transforms', () => {
    /**
     * Note: Transforms are stripped during JSON Schema conversion.
     * Use refinements for validation that should appear in JSON Schema.
     */

    it('refinements should validate correctly', () => {
      const schema = z.string().refine((val) => val.length >= 3, {
        message: 'String must be at least 3 characters',
      });

      expect(schema.safeParse('ab').success).toBe(false);
      expect(schema.safeParse('abc').success).toBe(true);
    });

    it('transforms work at runtime but throw when converting to JSON Schema by default', () => {
      const schema = z.string().transform((val) => val.toUpperCase());

      // Runtime transform works
      const result = schema.parse('hello');
      expect(result).toBe('HELLO');

      // Zod 4 throws by default when trying to convert transforms to JSON Schema
      // This is a key difference from Zod 3 which silently ignored transforms
      expect(() => z.toJSONSchema(schema, { target: 'draft-7' })).toThrow(
        'Transforms cannot be represented in JSON Schema',
      );
    });

    it('transforms can be converted with unrepresentable: "any" option', () => {
      const schema = z.string().transform((val) => val.toUpperCase());

      // Use unrepresentable: 'any' to allow conversion
      const jsonSchema = z.toJSONSchema(schema, {
        target: 'draft-7',
        unrepresentable: 'any',
      }) as Record<string, unknown>;

      // The transform is converted to 'any' type
      expect(jsonSchema).toBeDefined();
    });
  });
});
