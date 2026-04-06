/**
 * @fileoverview Core validation engine for MCP definitions.
 * Runs all lint rules against tool, resource, and prompt definitions
 * and produces a structured `LintReport`.
 * @module src/linter/validate
 */

import { checkDuplicateNames } from './rules/name-rules.js';
import { lintPromptDefinition } from './rules/prompt-rules.js';
import { lintResourceDefinition } from './rules/resource-rules.js';
import { lintServerJson } from './rules/server-json-rules.js';
import { lintAppToolResourcePairing, lintToolDefinition } from './rules/tool-rules.js';
import type { LintDiagnostic, LintInput, LintReport } from './types.js';

/**
 * Validates MCP tool, resource, and prompt definitions against the MCP spec
 * and framework conventions. Returns a structured report with errors and warnings.
 *
 * Errors represent MUST-level spec violations that will cause runtime failures.
 * Warnings represent SHOULD-level or quality issues that degrade behavior.
 *
 * @example
 * ```ts
 * import { validateDefinitions } from '@cyanheads/mcp-ts-core/linter';
 *
 * const report = validateDefinitions({
 *   tools: allToolDefinitions,
 *   resources: allResourceDefinitions,
 *   prompts: allPromptDefinitions,
 * });
 *
 * if (!report.passed) {
 *   console.error('MCP lint errors:', report.errors);
 *   process.exit(1);
 * }
 * ```
 */
export function validateDefinitions(input: LintInput): LintReport {
  const diagnostics: LintDiagnostic[] = [];
  const tools = input.tools ?? [];
  const resources = input.resources ?? [];
  const prompts = input.prompts ?? [];

  // Per-definition validation
  for (const def of tools) {
    diagnostics.push(...lintToolDefinition(def));
  }
  for (const def of resources) {
    diagnostics.push(...lintResourceDefinition(def));
  }
  for (const def of prompts) {
    diagnostics.push(...lintPromptDefinition(def));
  }

  // server.json manifest validation
  if (input.serverJson != null) {
    const pkgVersion = input.packageJson?.version;
    diagnostics.push(
      ...lintServerJson(
        input.serverJson,
        pkgVersion ? { packageJsonVersion: pkgVersion } : undefined,
      ),
    );
  }

  // Cross-definition duplicate checks
  const extractNames = (defs: unknown[]) =>
    defs
      .map((d) => (d as Record<string, unknown>)?.name)
      .filter((n): n is string => typeof n === 'string' && n.length > 0);

  diagnostics.push(...checkDuplicateNames(extractNames(tools), 'tool'));

  const resourceNames = resources
    .map((d) => {
      const r = d as Record<string, unknown>;
      return typeof r?.name === 'string'
        ? r.name
        : typeof r?.uriTemplate === 'string'
          ? r.uriTemplate
          : '';
    })
    .filter((n) => n.length > 0);
  diagnostics.push(...checkDuplicateNames(resourceNames, 'resource'));

  diagnostics.push(...checkDuplicateNames(extractNames(prompts), 'prompt'));

  // Cross-definition: app tool ↔ app resource pairing
  diagnostics.push(...lintAppToolResourcePairing(tools, resources));

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  return {
    errors,
    warnings,
    passed: errors.length === 0,
  };
}
