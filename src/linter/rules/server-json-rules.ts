/**
 * @fileoverview Lint rules for server.json manifest validation.
 * Validates server metadata against the MCP server manifest spec (2025-12-11).
 * @module src/linter/rules/server-json-rules
 */

import type { LintDiagnostic } from '../types.js';

const DEF_TYPE = 'server-json' as const;
const DEF_NAME = 'server.json';

/** Reverse-DNS name pattern from the spec. */
const NAME_PATTERN = /^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/;

/** Rejects version range specifiers. */
const VERSION_RANGE_PATTERN = /[~^>=<*x]/;

/** Loose semver check (major.minor.patch with optional pre-release/build). */
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/;

/** Valid transport types per spec. */
const TRANSPORT_TYPES = new Set(['stdio', 'streamable-http', 'sse']);

/** Transports that require a url field. */
const URL_TRANSPORTS = new Set(['streamable-http', 'sse']);

/** URL pattern from the spec. */
const URL_PATTERN = /^https?:\/\/[^\s]+$/;

/** Valid argument types. */
const ARGUMENT_TYPES = new Set(['positional', 'named']);

/** Valid input format values. */
const INPUT_FORMATS = new Set(['string', 'number', 'boolean', 'filepath']);

function diag(rule: string, severity: LintDiagnostic['severity'], message: string): LintDiagnostic {
  return { definitionName: DEF_NAME, definitionType: DEF_TYPE, message, rule, severity };
}

/**
 * Validates a parsed server.json manifest against the MCP server manifest spec.
 * Accepts `unknown` to catch structural issues before type narrowing.
 *
 * @param serverJson - Parsed server.json content (or undefined to skip).
 * @param crossCheck - Optional cross-validation data (e.g., package.json version).
 * @returns Array of lint diagnostics (errors and warnings).
 */
export function lintServerJson(
  serverJson: unknown,
  crossCheck?: { packageJsonVersion?: string },
): LintDiagnostic[] {
  if (serverJson == null) return [];

  const diagnostics: LintDiagnostic[] = [];

  if (typeof serverJson !== 'object' || Array.isArray(serverJson)) {
    diagnostics.push(diag('server-json-type', 'error', 'server.json must be a JSON object.'));
    return diagnostics;
  }

  const s = serverJson as Record<string, unknown>;

  // ── Required fields ──────────────────────────────────────────────────

  // name: required, 3-200 chars, reverse-DNS pattern
  if (typeof s.name !== 'string' || s.name.length === 0) {
    diagnostics.push(diag('server-json-name-required', 'error', 'name is required.'));
  } else {
    if (s.name.length < 3 || s.name.length > 200) {
      diagnostics.push(
        diag(
          'server-json-name-length',
          'error',
          `name must be 3–200 characters, got ${s.name.length}.`,
        ),
      );
    }
    if (!NAME_PATTERN.test(s.name)) {
      diagnostics.push(
        diag(
          'server-json-name-format',
          'error',
          `name '${s.name}' must match reverse-DNS format: owner/project (pattern: ${NAME_PATTERN.source}).`,
        ),
      );
    }
  }

  // description: required, 1-100 chars
  if (typeof s.description !== 'string' || s.description.length === 0) {
    diagnostics.push(diag('server-json-description-required', 'error', 'description is required.'));
  } else if (s.description.length > 100) {
    diagnostics.push(
      diag(
        'server-json-description-length',
        'warning',
        `description exceeds 100 characters (${s.description.length}). Some registries may truncate.`,
      ),
    );
  }

  // version: required, no ranges
  if (typeof s.version !== 'string' || s.version.length === 0) {
    diagnostics.push(diag('server-json-version-required', 'error', 'version is required.'));
  } else {
    if (s.version.length > 255) {
      diagnostics.push(
        diag(
          'server-json-version-length',
          'error',
          `version exceeds 255 characters (${s.version.length}).`,
        ),
      );
    }
    if (VERSION_RANGE_PATTERN.test(s.version)) {
      diagnostics.push(
        diag(
          'server-json-version-no-range',
          'error',
          `version '${s.version}' looks like a range. Must be a specific version.`,
        ),
      );
    }
    if (!SEMVER_PATTERN.test(s.version)) {
      diagnostics.push(
        diag(
          'server-json-version-semver',
          'warning',
          `version '${s.version}' is not valid semver. Semver is recommended.`,
        ),
      );
    }
  }

  // ── Optional fields with structure constraints ───────────────────────

  // repository
  if (s.repository != null) {
    if (typeof s.repository !== 'object' || Array.isArray(s.repository)) {
      diagnostics.push(
        diag('server-json-repository-type', 'error', 'repository must be an object.'),
      );
    } else {
      const repo = s.repository as Record<string, unknown>;
      if (typeof repo.url !== 'string' || repo.url.length === 0) {
        diagnostics.push(
          diag(
            'server-json-repository-url',
            'error',
            'repository.url is required when repository is present.',
          ),
        );
      }
      if (typeof repo.source !== 'string' || repo.source.length === 0) {
        diagnostics.push(
          diag(
            'server-json-repository-source',
            'error',
            'repository.source is required when repository is present.',
          ),
        );
      }
    }
  }

  // packages
  if (s.packages != null) {
    if (!Array.isArray(s.packages)) {
      diagnostics.push(diag('server-json-packages-type', 'error', 'packages must be an array.'));
    } else {
      for (let i = 0; i < s.packages.length; i++) {
        diagnostics.push(...lintPackageEntry(s.packages[i], i, s.version as string));
      }
    }
  }

  // remotes
  if (s.remotes != null) {
    if (!Array.isArray(s.remotes)) {
      diagnostics.push(diag('server-json-remotes-type', 'error', 'remotes must be an array.'));
    } else {
      for (let i = 0; i < s.remotes.length; i++) {
        diagnostics.push(...lintRemoteEntry(s.remotes[i], i));
      }
    }
  }

  // ── Cross-validation ─────────────────────────────────────────────────

  if (
    crossCheck?.packageJsonVersion &&
    typeof s.version === 'string' &&
    s.version.length > 0 &&
    s.version !== crossCheck.packageJsonVersion
  ) {
    diagnostics.push(
      diag(
        'server-json-version-sync',
        'warning',
        `version '${s.version}' does not match package.json version '${crossCheck.packageJsonVersion}'.`,
      ),
    );
  }

  return diagnostics;
}

/** Validates a single entry in the packages array. */
function lintPackageEntry(pkg: unknown, index: number, rootVersion: string): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  const prefix = `packages[${index}]`;

  if (typeof pkg !== 'object' || pkg == null || Array.isArray(pkg)) {
    diagnostics.push(diag('server-json-package-type', 'error', `${prefix} must be an object.`));
    return diagnostics;
  }

  const p = pkg as Record<string, unknown>;

  // registryType: required
  if (typeof p.registryType !== 'string' || p.registryType.length === 0) {
    diagnostics.push(
      diag('server-json-package-registry', 'error', `${prefix}.registryType is required.`),
    );
  }

  // identifier: required
  if (typeof p.identifier !== 'string' || p.identifier.length === 0) {
    diagnostics.push(
      diag('server-json-package-identifier', 'error', `${prefix}.identifier is required.`),
    );
  }

  // transport: required
  if (p.transport == null) {
    diagnostics.push(
      diag('server-json-package-transport', 'error', `${prefix}.transport is required.`),
    );
  } else {
    diagnostics.push(...lintTransport(p.transport, `${prefix}.transport`));
  }

  // version: must not be "latest", should match root
  if (typeof p.version === 'string') {
    if (p.version === 'latest') {
      diagnostics.push(
        diag(
          'server-json-package-no-latest',
          'error',
          `${prefix}.version must be a specific version, not "latest".`,
        ),
      );
    }
    if (
      rootVersion &&
      p.version.length > 0 &&
      p.version !== 'latest' &&
      p.version !== rootVersion
    ) {
      diagnostics.push(
        diag(
          'server-json-package-version-sync',
          'warning',
          `${prefix}.version '${p.version}' does not match root version '${rootVersion}'.`,
        ),
      );
    }
  }

  // packageArguments
  if (p.packageArguments != null) {
    if (!Array.isArray(p.packageArguments)) {
      diagnostics.push(
        diag(
          'server-json-package-args-type',
          'error',
          `${prefix}.packageArguments must be an array.`,
        ),
      );
    } else {
      for (let j = 0; j < p.packageArguments.length; j++) {
        diagnostics.push(
          ...lintArgument(p.packageArguments[j], `${prefix}.packageArguments[${j}]`),
        );
      }
    }
  }

  // runtimeArguments
  if (p.runtimeArguments != null) {
    if (!Array.isArray(p.runtimeArguments)) {
      diagnostics.push(
        diag(
          'server-json-runtime-args-type',
          'error',
          `${prefix}.runtimeArguments must be an array.`,
        ),
      );
    } else {
      for (let j = 0; j < p.runtimeArguments.length; j++) {
        diagnostics.push(
          ...lintArgument(p.runtimeArguments[j], `${prefix}.runtimeArguments[${j}]`),
        );
      }
    }
  }

  // environmentVariables
  if (p.environmentVariables != null) {
    if (!Array.isArray(p.environmentVariables)) {
      diagnostics.push(
        diag(
          'server-json-env-vars-type',
          'error',
          `${prefix}.environmentVariables must be an array.`,
        ),
      );
    } else {
      for (let j = 0; j < p.environmentVariables.length; j++) {
        diagnostics.push(
          ...lintEnvVar(p.environmentVariables[j], `${prefix}.environmentVariables[${j}]`),
        );
      }
    }
  }

  return diagnostics;
}

/** Validates a single entry in the remotes array. */
function lintRemoteEntry(remote: unknown, index: number): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  const prefix = `remotes[${index}]`;

  if (typeof remote !== 'object' || remote == null || Array.isArray(remote)) {
    diagnostics.push(diag('server-json-remote-type', 'error', `${prefix} must be an object.`));
    return diagnostics;
  }

  const r = remote as Record<string, unknown>;

  // Remote transports must be streamable-http or sse (no stdio)
  if (r.type == null) {
    diagnostics.push(
      diag('server-json-remote-transport-type', 'error', `${prefix}.type is required.`),
    );
  } else if (r.type === 'stdio') {
    diagnostics.push(
      diag(
        'server-json-remote-no-stdio',
        'error',
        `${prefix}.type is 'stdio' but remotes only support 'streamable-http' or 'sse'.`,
      ),
    );
  } else {
    diagnostics.push(...lintTransport(r, prefix));
  }

  return diagnostics;
}

/** Validates a transport object. */
function lintTransport(transport: unknown, path: string): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];

  if (typeof transport !== 'object' || transport == null || Array.isArray(transport)) {
    diagnostics.push(diag('server-json-transport-type', 'error', `${path} must be an object.`));
    return diagnostics;
  }

  const t = transport as Record<string, unknown>;

  if (typeof t.type !== 'string' || !TRANSPORT_TYPES.has(t.type)) {
    diagnostics.push(
      diag(
        'server-json-transport-type-value',
        'error',
        `${path}.type must be one of: ${[...TRANSPORT_TYPES].join(', ')}. Got '${String(t.type)}'.`,
      ),
    );
    return diagnostics;
  }

  if (URL_TRANSPORTS.has(t.type)) {
    if (typeof t.url !== 'string' || t.url.length === 0) {
      diagnostics.push(
        diag(
          'server-json-transport-url-required',
          'error',
          `${path}.url is required for transport type '${t.type}'.`,
        ),
      );
    } else if (!URL_PATTERN.test(t.url)) {
      diagnostics.push(
        diag(
          'server-json-transport-url-format',
          'warning',
          `${path}.url '${t.url}' should match pattern: ${URL_PATTERN.source}.`,
        ),
      );
    }
  }

  return diagnostics;
}

/** Validates a single argument entry (positional or named). */
function lintArgument(arg: unknown, path: string): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];

  if (typeof arg !== 'object' || arg == null || Array.isArray(arg)) {
    diagnostics.push(diag('server-json-argument-type', 'error', `${path} must be an object.`));
    return diagnostics;
  }

  const a = arg as Record<string, unknown>;

  if (typeof a.type !== 'string' || !ARGUMENT_TYPES.has(a.type)) {
    diagnostics.push(
      diag(
        'server-json-argument-type-value',
        'error',
        `${path}.type must be 'positional' or 'named'. Got '${String(a.type)}'.`,
      ),
    );
    return diagnostics;
  }

  if (a.type === 'named') {
    if (typeof a.name !== 'string' || a.name.length === 0) {
      diagnostics.push(
        diag('server-json-argument-name', 'error', `${path}.name is required for named arguments.`),
      );
    }
  }

  // Positional args need either value or valueHint
  if (a.type === 'positional') {
    const hasValue = typeof a.value === 'string' && a.value.length > 0;
    const hasHint = typeof a.valueHint === 'string' && a.valueHint.length > 0;
    if (!hasValue && !hasHint) {
      diagnostics.push(
        diag(
          'server-json-argument-value',
          'error',
          `${path} (positional) requires either 'value' or 'valueHint'.`,
        ),
      );
    }
  }

  // format validation if present
  if (a.format != null && (typeof a.format !== 'string' || !INPUT_FORMATS.has(a.format))) {
    diagnostics.push(
      diag(
        'server-json-input-format',
        'warning',
        `${path}.format should be one of: ${[...INPUT_FORMATS].join(', ')}. Got '${String(a.format)}'.`,
      ),
    );
  }

  return diagnostics;
}

/** Validates a single environment variable entry. */
function lintEnvVar(envVar: unknown, path: string): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];

  if (typeof envVar !== 'object' || envVar == null || Array.isArray(envVar)) {
    diagnostics.push(diag('server-json-env-var-type', 'error', `${path} must be an object.`));
    return diagnostics;
  }

  const e = envVar as Record<string, unknown>;

  if (typeof e.name !== 'string' || e.name.length === 0) {
    diagnostics.push(diag('server-json-env-var-name', 'error', `${path}.name is required.`));
  }

  if (e.description == null || (typeof e.description === 'string' && e.description.length === 0)) {
    diagnostics.push(
      diag(
        'server-json-env-var-description',
        'warning',
        `${path} '${typeof e.name === 'string' ? e.name : '?'}' has no description.`,
      ),
    );
  }

  if (e.format != null && (typeof e.format !== 'string' || !INPUT_FORMATS.has(e.format))) {
    diagnostics.push(
      diag(
        'server-json-input-format',
        'warning',
        `${path}.format should be one of: ${[...INPUT_FORMATS].join(', ')}. Got '${String(e.format)}'.`,
      ),
    );
  }

  return diagnostics;
}
