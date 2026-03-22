/**
 * @fileoverview Tool-specific lint rules.
 * Validates tool definitions against MCP spec and framework conventions.
 * @module src/linter/rules/tool-rules
 */

import type { LintDiagnostic } from '../types.js';
import { checkNameRequired, checkToolNameFormat } from './name-rules.js';
import {
  checkFieldDescriptions,
  checkIsZodObject,
  checkSchemaSerializable,
} from './schema-rules.js';

/**
 * Runs all lint rules against a single tool definition.
 * Accepts `unknown` to catch structural issues before type narrowing.
 */
export function lintToolDefinition(def: unknown): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  const d = def as Record<string, unknown>;
  const name = typeof d?.name === 'string' ? d.name : '';
  const displayName = name || '<unnamed>';

  // Name validation
  const nameReq = checkNameRequired(d?.name, 'tool', name);
  if (nameReq) diagnostics.push(nameReq);

  if (name) {
    const nameFmt = checkToolNameFormat(name);
    if (nameFmt) diagnostics.push(nameFmt);
  }

  // Description
  if (typeof d?.description !== 'string' || d.description.length === 0) {
    diagnostics.push({
      rule: 'description-required',
      severity: 'warning',
      message: `Tool '${displayName}' has no description. Tools without descriptions degrade LLM tool selection.`,
      definitionType: 'tool',
      definitionName: displayName,
    });
  }

  // Handler
  if (typeof d?.handler !== 'function') {
    diagnostics.push({
      rule: 'handler-required',
      severity: 'error',
      message: `Tool '${displayName}' is missing a handler function.`,
      definitionType: 'tool',
      definitionName: displayName,
    });
  }

  // Input schema: must be ZodObject, serializable to JSON Schema
  const inputCheck = checkIsZodObject(d?.input, 'input', 'tool', displayName);
  if (inputCheck) {
    diagnostics.push(inputCheck);
  } else {
    diagnostics.push(...checkFieldDescriptions(d?.input, 'input', 'tool', displayName));
    const inputSerial = checkSchemaSerializable(d?.input, 'input', 'tool', displayName);
    if (inputSerial) diagnostics.push(inputSerial);
  }

  // Output schema: must be ZodObject, serializable to JSON Schema
  const outputCheck = checkIsZodObject(d?.output, 'output', 'tool', displayName);
  if (outputCheck) {
    diagnostics.push(outputCheck);
  } else {
    diagnostics.push(...checkFieldDescriptions(d?.output, 'output', 'tool', displayName));
    const outputSerial = checkSchemaSerializable(d?.output, 'output', 'tool', displayName);
    if (outputSerial) diagnostics.push(outputSerial);
  }

  // Auth scopes validation
  if (d?.auth !== undefined) {
    diagnostics.push(...lintAuthScopes(d.auth, 'tool', displayName));
  }

  // Annotations validation
  if (d?.annotations && typeof d.annotations === 'object') {
    diagnostics.push(...lintToolAnnotations(d.annotations as Record<string, unknown>, name));
  }

  return diagnostics;
}

/** Validates that auth scopes are well-formed (array of non-empty strings). */
export function lintAuthScopes(
  auth: unknown,
  definitionType: LintDiagnostic['definitionType'],
  definitionName: string,
): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];

  if (!Array.isArray(auth)) {
    diagnostics.push({
      rule: 'auth-type',
      severity: 'error',
      message: `${definitionType} '${definitionName}' auth must be an array of scope strings.`,
      definitionType,
      definitionName,
    });
    return diagnostics;
  }

  for (let i = 0; i < auth.length; i++) {
    const scope = auth[i];
    if (typeof scope !== 'string' || scope.trim().length === 0) {
      diagnostics.push({
        rule: 'auth-scope-format',
        severity: 'error',
        message:
          `${definitionType} '${definitionName}' auth[${i}] must be a non-empty string, ` +
          `got ${typeof scope === 'string' ? 'empty string' : typeof scope}.`,
        definitionType,
        definitionName,
      });
    }
  }

  return diagnostics;
}

/** Validates that annotation hint values are booleans where expected. */
function lintToolAnnotations(
  annotations: Record<string, unknown>,
  toolName: string,
): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  const booleanHints = [
    'readOnlyHint',
    'destructiveHint',
    'idempotentHint',
    'openWorldHint',
  ] as const;

  for (const hint of booleanHints) {
    if (hint in annotations && typeof annotations[hint] !== 'boolean') {
      diagnostics.push({
        rule: 'annotation-type',
        severity: 'warning',
        message: `Tool '${toolName}' annotation '${hint}' should be a boolean, got ${typeof annotations[hint]}.`,
        definitionType: 'tool',
        definitionName: toolName,
      });
    }
  }

  // Semantic coherence: destructiveHint and idempotentHint are meaningless when readOnlyHint is true
  if (annotations.readOnlyHint === true) {
    if ('destructiveHint' in annotations) {
      diagnostics.push({
        rule: 'annotation-coherence',
        severity: 'warning',
        message:
          `Tool '${toolName}' sets destructiveHint while readOnlyHint is true. ` +
          'destructiveHint is meaningless for read-only tools.',
        definitionType: 'tool',
        definitionName: toolName,
      });
    }
    if ('idempotentHint' in annotations) {
      diagnostics.push({
        rule: 'annotation-coherence',
        severity: 'warning',
        message:
          `Tool '${toolName}' sets idempotentHint while readOnlyHint is true. ` +
          'Read-only tools are inherently idempotent — this hint is redundant.',
        definitionType: 'tool',
        definitionName: toolName,
      });
    }
  }

  return diagnostics;
}
