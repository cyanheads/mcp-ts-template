/**
 * @fileoverview Public barrel for the MCP definition linter.
 * Exports `validateDefinitions()` and all types needed to consume lint reports.
 * @module src/linter/index
 */

export type {
  LintDefinitionType,
  LintDiagnostic,
  LintInput,
  LintReport,
  LintSeverity,
} from './types.js';
export { validateDefinitions } from './validate.js';
