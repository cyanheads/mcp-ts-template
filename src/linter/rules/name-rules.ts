/**
 * @fileoverview Lint rules for definition names: non-empty, format, uniqueness.
 * Covers MCP spec rules T1, T8-T12, R2, P1.
 * @module src/linter/rules/name-rules
 */

import type { LintDiagnostic } from '../types.js';

/** MCP spec: tool names should match [A-Za-z0-9_\-.]  and be 1-128 chars. */
const TOOL_NAME_RE = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Validates that a definition name is non-empty.
 * Spec: T1, R2, P1 — name is REQUIRED.
 */
export function checkNameRequired(
  name: unknown,
  definitionType: LintDiagnostic['definitionType'],
  definitionName: string,
): LintDiagnostic | null {
  if (typeof name !== 'string' || name.length === 0) {
    return {
      rule: 'name-required',
      severity: 'error',
      message: `${definitionType} name is required and must be a non-empty string.`,
      definitionType,
      definitionName: definitionName || '<unnamed>',
    };
  }
  return null;
}

/**
 * Validates tool name format against MCP spec (T8-T10).
 * Only applies to tools — resources and prompts have no specified format.
 */
export function checkToolNameFormat(name: string): LintDiagnostic | null {
  if (!TOOL_NAME_RE.test(name)) {
    return {
      rule: 'name-format',
      severity: 'warning',
      message:
        `Tool name '${name}' does not match MCP spec format [A-Za-z0-9._-]{1,128}. ` +
        'This may cause issues with some MCP clients.',
      definitionType: 'tool',
      definitionName: name,
    };
  }
  return null;
}

/**
 * Checks for duplicate names within a set of definitions.
 * Spec: T11 — names SHOULD be unique within a server.
 */
export function checkDuplicateNames(
  names: string[],
  definitionType: LintDiagnostic['definitionType'],
): LintDiagnostic[] {
  const seen = new Map<string, number>();
  const diagnostics: LintDiagnostic[] = [];

  for (const name of names) {
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    if (count === 2) {
      diagnostics.push({
        rule: 'name-unique',
        severity: 'error',
        message: `Duplicate ${definitionType} name '${name}'. Each ${definitionType} must have a unique name.`,
        definitionType,
        definitionName: name,
      });
    }
  }

  return diagnostics;
}
