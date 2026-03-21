/**
 * @fileoverview Resource-specific lint rules.
 * Validates resource definitions against MCP spec and framework conventions.
 * @module src/linter/rules/resource-rules
 */

import type { LintDiagnostic } from '../types.js';
import { checkNameRequired } from './name-rules.js';
import { checkFieldDescriptions, checkIsZodObject } from './schema-rules.js';

/**
 * Runs all lint rules against a single resource definition.
 */
export function lintResourceDefinition(def: unknown): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  const d = def as Record<string, unknown>;
  const uriTemplate = typeof d?.uriTemplate === 'string' ? d.uriTemplate : '';
  const name = typeof d?.name === 'string' ? d.name : uriTemplate;
  const displayName = name || '<unnamed>';

  // URI template is required
  if (!uriTemplate) {
    diagnostics.push({
      rule: 'uri-template-required',
      severity: 'error',
      message: `Resource '${displayName}' is missing a uriTemplate.`,
      definitionType: 'resource',
      definitionName: displayName,
    });
  } else {
    // Validate URI template format (basic RFC 6570 check)
    const templateCheck = checkUriTemplate(uriTemplate, name);
    if (templateCheck) diagnostics.push(templateCheck);
  }

  // Name fallback warning
  if (!d?.name && uriTemplate) {
    diagnostics.push({
      rule: 'resource-name-not-uri',
      severity: 'warning',
      message:
        `Resource '${uriTemplate}' has no explicit name and will use the URI template as its display name. ` +
        'Consider adding a name for cleaner resources/list output.',
      definitionType: 'resource',
      definitionName: uriTemplate,
    });
  }

  // Name validation (when explicitly provided)
  if (d?.name !== undefined) {
    const nameReq = checkNameRequired(d.name, 'resource', name);
    if (nameReq) diagnostics.push(nameReq);
  }

  // Description
  if (typeof d?.description !== 'string' || d.description.length === 0) {
    diagnostics.push({
      rule: 'description-required',
      severity: 'warning',
      message: `Resource '${displayName}' has no description.`,
      definitionType: 'resource',
      definitionName: displayName,
    });
  }

  // Handler
  if (typeof d?.handler !== 'function') {
    diagnostics.push({
      rule: 'handler-required',
      severity: 'error',
      message: `Resource '${displayName}' is missing a handler function.`,
      definitionType: 'resource',
      definitionName: displayName,
    });
  }

  // Params schema (optional, but must be ZodObject when present)
  if (d?.params !== undefined) {
    const paramsCheck = checkIsZodObject(d.params, 'params', 'resource', displayName);
    if (paramsCheck) {
      diagnostics.push(paramsCheck);
    } else {
      diagnostics.push(...checkFieldDescriptions(d.params, 'params', 'resource', displayName));
    }
  }

  // Output schema (optional, but must be ZodObject when present)
  if (d?.output !== undefined) {
    const outputCheck = checkIsZodObject(d.output, 'output', 'resource', displayName);
    if (outputCheck) diagnostics.push(outputCheck);
  }

  return diagnostics;
}

/**
 * Basic URI template validation.
 * Checks for balanced braces and non-empty variable names (RFC 6570 subset).
 */
function checkUriTemplate(template: string, name: string): LintDiagnostic | null {
  // Check for unbalanced braces
  let depth = 0;
  for (const char of template) {
    if (char === '{') depth++;
    if (char === '}') depth--;
    if (depth < 0) {
      return {
        rule: 'uri-template-valid',
        severity: 'error',
        message: `Resource '${name}' has an invalid URI template: unbalanced braces in '${template}'.`,
        definitionType: 'resource',
        definitionName: name,
      };
    }
  }
  if (depth !== 0) {
    return {
      rule: 'uri-template-valid',
      severity: 'error',
      message: `Resource '${name}' has an invalid URI template: unclosed brace in '${template}'.`,
      definitionType: 'resource',
      definitionName: name,
    };
  }

  // Check for empty variable names like {}
  if (/\{\s*\}/.test(template)) {
    return {
      rule: 'uri-template-valid',
      severity: 'error',
      message: `Resource '${name}' has an invalid URI template: empty variable name in '${template}'.`,
      definitionType: 'resource',
      definitionName: name,
    };
  }

  return null;
}
