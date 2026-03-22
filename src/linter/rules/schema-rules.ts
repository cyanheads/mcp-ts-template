/**
 * @fileoverview Lint rules for Zod schema validation: type checking, `.describe()` presence,
 * and JSON Schema serializability.
 * Covers MCP spec rules T3-T5 and framework convention for field descriptions.
 * @module src/linter/rules/schema-rules
 */

import type { ZodObject, ZodRawShape } from 'zod';
import { toJSONSchema } from 'zod/v4/core';

import type { LintDiagnostic } from '../types.js';

/**
 * Checks that a schema is a ZodObject (required for tool inputSchema).
 * Spec: T3-T4 — inputSchema MUST be a JSON Schema object with type: "object".
 */
export function checkIsZodObject(
  schema: unknown,
  fieldName: string,
  definitionType: LintDiagnostic['definitionType'],
  definitionName: string,
): LintDiagnostic | null {
  if (!isZodObject(schema)) {
    return {
      rule: 'schema-is-object',
      severity: 'error',
      message:
        `${definitionType} '${definitionName}' ${fieldName} must be a z.object(). ` +
        'MCP spec requires inputSchema to have type: "object".',
      definitionType,
      definitionName,
    };
  }
  return null;
}

/**
 * Checks that all top-level fields in a ZodObject have `.describe()` set.
 * Framework convention: all fields need `.describe()` for LLM discoverability.
 */
export function checkFieldDescriptions(
  schema: unknown,
  fieldName: string,
  definitionType: LintDiagnostic['definitionType'],
  definitionName: string,
): LintDiagnostic[] {
  if (!isZodObject(schema)) return [];

  const diagnostics: LintDiagnostic[] = [];
  const shape = (schema as ZodObject<ZodRawShape>).shape;

  for (const [key, field] of Object.entries(shape)) {
    const zodField = field as { description?: string; _zod?: { def?: { type?: string } } };

    // Walk through optional/nullable/default wrappers to find the inner description
    if (!hasDescription(zodField)) {
      diagnostics.push({
        rule: 'describe-on-fields',
        severity: 'warning',
        message:
          `${definitionType} '${definitionName}' ${fieldName}.${key} is missing .describe(). ` +
          'Add .describe() to improve LLM tool-use quality.',
        definitionType,
        definitionName,
      });
    }
  }

  return diagnostics;
}

/**
 * Checks that a Zod schema can be converted to JSON Schema.
 * The MCP SDK serializes schemas via `toJSONSchema()` when handling `tools/list`.
 * Types like `z.custom()`, `z.date()`, `z.transform()`, etc. throw at serialization
 * time, causing a hard runtime failure for any client that enumerates tools.
 */
export function checkSchemaSerializable(
  schema: unknown,
  fieldName: string,
  definitionType: LintDiagnostic['definitionType'],
  definitionName: string,
): LintDiagnostic | null {
  if (!isZodObject(schema)) return null;

  try {
    toJSONSchema(schema as ZodObject<ZodRawShape>);
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Schema contains non-serializable types';
    return {
      rule: 'schema-serializable',
      severity: 'error',
      message:
        `${definitionType} '${definitionName}' ${fieldName} cannot be converted to JSON Schema: ${message}. ` +
        'Replace non-serializable types (z.custom(), z.date(), z.transform(), z.bigint(), etc.) with structural Zod types.',
      definitionType,
      definitionName,
    };
  }
}

/** Runtime check for ZodObject via Zod 4's `_zod.def.type`. */
function isZodObject(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const zod = (value as Record<string, unknown>)._zod as { def?: { type?: string } } | undefined;
  return zod?.def?.type === 'object';
}

/**
 * Checks whether a Zod schema (possibly wrapped in optional/nullable/default)
 * has a `.describe()` set at any level.
 */
function hasDescription(field: unknown): boolean {
  if (!field || typeof field !== 'object') return false;
  const f = field as { description?: string; _zod?: { def?: { innerType?: unknown } } };

  // Direct description on this schema
  if (typeof f.description === 'string' && f.description.length > 0) return true;

  // Walk through wrappers (optional, nullable, default, etc.)
  const inner = f._zod?.def?.innerType;
  if (inner) return hasDescription(inner);

  return false;
}
