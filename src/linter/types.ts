/**
 * @fileoverview Types for the MCP definition linter.
 * Defines the diagnostic structure, severity levels, and validation report
 * used by all lint rules and the `validateDefinitions` entry point.
 * @module src/linter/types
 */

/** Severity of a lint diagnostic. */
export type LintSeverity = 'error' | 'warning';

/**
 * A single lint diagnostic produced by a validation rule.
 * Errors represent spec violations that will cause runtime failures.
 * Warnings represent SHOULD-level or quality issues.
 */
export interface LintDiagnostic {
  /** Name of the specific definition (tool/resource/prompt name). */
  definitionName: string;
  /** Which definition type produced this diagnostic. */
  definitionType: 'tool' | 'resource' | 'prompt';
  /** Human-readable message describing the issue. */
  message: string;
  /** Rule identifier (e.g., 'name-format', 'describe-on-fields'). */
  rule: string;
  /** Severity: 'error' for MUST violations, 'warning' for SHOULD/quality. */
  severity: LintSeverity;
}

/**
 * Result of running `validateDefinitions()`.
 */
export interface LintReport {
  /** All diagnostics with severity 'error'. */
  errors: LintDiagnostic[];
  /** True when zero errors (warnings are acceptable). */
  passed: boolean;
  /** All diagnostics with severity 'warning'. */
  warnings: LintDiagnostic[];
}

/**
 * Input to `validateDefinitions()`.
 * Mirrors the definition arrays from `CreateAppOptions`.
 */
export interface LintInput {
  prompts?: unknown[];
  resources?: unknown[];
  tools?: unknown[];
}
