/**
 * @fileoverview Prompt-specific lint rules.
 * Validates prompt definitions against MCP spec and framework conventions.
 * @module src/linter/rules/prompt-rules
 */

import type { LintDiagnostic } from '../types.js';
import { checkNameRequired } from './name-rules.js';
import { checkFieldDescriptions, checkIsZodObject } from './schema-rules.js';

/**
 * Runs all lint rules against a single prompt definition.
 */
export function lintPromptDefinition(def: unknown): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  const d = def as Record<string, unknown>;
  const name = typeof d?.name === 'string' ? d.name : '';
  const displayName = name || '<unnamed>';

  // Name validation
  const nameReq = checkNameRequired(d?.name, 'prompt', name);
  if (nameReq) diagnostics.push(nameReq);

  // Description
  if (typeof d?.description !== 'string' || d.description.length === 0) {
    diagnostics.push({
      rule: 'description-required',
      severity: 'warning',
      message: `Prompt '${displayName}' has no description.`,
      definitionType: 'prompt',
      definitionName: displayName,
    });
  }

  // Generate function
  if (typeof d?.generate !== 'function') {
    diagnostics.push({
      rule: 'generate-required',
      severity: 'error',
      message: `Prompt '${displayName}' is missing a generate function.`,
      definitionType: 'prompt',
      definitionName: displayName,
    });
  }

  // Args schema (optional, but must be ZodObject when present)
  if (d?.args !== undefined) {
    const argsCheck = checkIsZodObject(d.args, 'args', 'prompt', displayName);
    if (argsCheck) {
      diagnostics.push(argsCheck);
    } else {
      diagnostics.push(...checkFieldDescriptions(d.args, 'args', 'prompt', displayName));
    }
  }

  return diagnostics;
}
