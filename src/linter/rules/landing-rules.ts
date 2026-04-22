/**
 * @fileoverview Landing page configuration lint rules.
 * Enforces content limits (tagline length, logo size, link count, repoRoot
 * shape) at startup so surprising input fails loudly instead of quietly at
 * render time.
 * @module src/linter/rules/landing-rules
 */

import {
  GITHUB_REPO_ROOT_PATTERN,
  LANDING_MAX_ENV_EXAMPLE,
  LANDING_MAX_LINKS,
  LANDING_MAX_LOGO_BYTES,
  LANDING_MAX_TAGLINE_LENGTH,
} from '@/core/serverManifest.js';

import type { LintDiagnostic } from '../types.js';

const LANDING = 'landing';
const NAME = 'landing';

function error(rule: string, message: string): LintDiagnostic {
  return {
    rule,
    severity: 'error',
    message,
    definitionType: LANDING,
    definitionName: NAME,
  };
}

function warn(rule: string, message: string): LintDiagnostic {
  return {
    rule,
    severity: 'warning',
    message,
    definitionType: LANDING,
    definitionName: NAME,
  };
}

/**
 * Reject CSS values that could escape the custom-property declaration context
 * (`--accent: ${value};`). The renderer HTML-escapes the value, but that's the
 * wrong escape for a CSS context — `;`, `{`, `}`, comment markers, and backslash
 * escapes all survive HTML escaping and can break out. This check is the real
 * defense; it's a content shape check, not a full CSS color parser, so new
 * color spaces (e.g. `oklch`, `color-mix`, future additions) pass through
 * without regex churn.
 */
function isSafeCssColor(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 128) return false;
  if (/[;{}\\<>]/.test(trimmed)) return false;
  if (trimmed.includes('/*') || trimmed.includes('*/')) return false;
  return /^[#a-zA-Z]/.test(trimmed);
}

/** Approximate byte size of a data URI's decoded content, given its raw length. */
function approximateDataUriBytes(uri: string): number {
  // data:image/png;base64,AAAA...  — base64-encoded payload is ~4/3× the raw bytes.
  const commaIndex = uri.indexOf(',');
  if (commaIndex < 0) return uri.length;
  const payload = uri.slice(commaIndex + 1);
  // For base64, decoded size = (payload length * 3) / 4, less padding.
  if (uri.startsWith('data:') && /;base64/i.test(uri.slice(0, commaIndex))) {
    const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
    return Math.floor((payload.length * 3) / 4) - padding;
  }
  // URL-encoded payload — treat byte count as character count.
  return payload.length;
}

/**
 * Validate the consumer-supplied `landing` object shape.
 * Returns an empty array when `landing` is undefined (nothing to validate)
 * or when the object passes every rule.
 */
export function lintLandingConfig(landing: unknown): LintDiagnostic[] {
  if (landing == null) return [];
  if (typeof landing !== 'object' || Array.isArray(landing)) {
    return [error('landing-shape', 'landing must be a plain object.')];
  }

  const diagnostics: LintDiagnostic[] = [];
  const l = landing as Record<string, unknown>;

  // tagline
  if (l.tagline != null) {
    if (typeof l.tagline !== 'string') {
      diagnostics.push(error('landing-tagline-type', 'landing.tagline must be a string.'));
    } else if (l.tagline.length > LANDING_MAX_TAGLINE_LENGTH) {
      diagnostics.push(
        error(
          'landing-tagline-length',
          `landing.tagline is ${l.tagline.length} chars; max is ${LANDING_MAX_TAGLINE_LENGTH}.`,
        ),
      );
    }
  }

  // logo
  if (l.logo != null) {
    if (typeof l.logo !== 'string') {
      diagnostics.push(error('landing-logo-type', 'landing.logo must be a string.'));
    } else if (l.logo.startsWith('data:')) {
      const bytes = approximateDataUriBytes(l.logo);
      if (bytes > LANDING_MAX_LOGO_BYTES) {
        diagnostics.push(
          error(
            'landing-logo-size',
            `landing.logo data URI is ~${bytes} bytes; max is ${LANDING_MAX_LOGO_BYTES}. Inline a smaller asset or host it separately.`,
          ),
        );
      }
    }
  }

  // links
  if (l.links != null) {
    if (!Array.isArray(l.links)) {
      diagnostics.push(error('landing-links-type', 'landing.links must be an array.'));
    } else {
      if (l.links.length > LANDING_MAX_LINKS) {
        diagnostics.push(
          warn(
            'landing-links-count',
            `landing.links has ${l.links.length} entries; max is ${LANDING_MAX_LINKS}. Extras will be dropped.`,
          ),
        );
      }
      for (const [i, rawLink] of l.links.entries()) {
        if (!rawLink || typeof rawLink !== 'object') {
          diagnostics.push(
            error(
              'landing-link-shape',
              `landing.links[${i}] must be an object with href and label.`,
            ),
          );
          continue;
        }
        const link = rawLink as Record<string, unknown>;
        if (typeof link.href !== 'string' || link.href.length === 0) {
          diagnostics.push(
            error('landing-link-href', `landing.links[${i}].href must be a non-empty string.`),
          );
        }
        if (typeof link.label !== 'string' || link.label.length === 0) {
          diagnostics.push(
            error('landing-link-label', `landing.links[${i}].label must be a non-empty string.`),
          );
        }
      }
    }
  }

  // repoRoot
  if (l.repoRoot != null) {
    if (typeof l.repoRoot !== 'string') {
      diagnostics.push(error('landing-repo-root-type', 'landing.repoRoot must be a string.'));
    } else if (!GITHUB_REPO_ROOT_PATTERN.test(l.repoRoot)) {
      diagnostics.push(
        error(
          'landing-repo-root-shape',
          `landing.repoRoot must match https://github.com/{owner}/{repo} — got "${l.repoRoot}".`,
        ),
      );
    }
  }

  // envExample
  if (l.envExample != null) {
    if (typeof l.envExample !== 'object' || Array.isArray(l.envExample)) {
      diagnostics.push(
        error('landing-env-example-type', 'landing.envExample must be a plain object.'),
      );
    } else {
      const entries = Object.entries(l.envExample as Record<string, unknown>);
      if (entries.length > LANDING_MAX_ENV_EXAMPLE) {
        diagnostics.push(
          warn(
            'landing-env-example-count',
            `landing.envExample has ${entries.length} entries; max is ${LANDING_MAX_ENV_EXAMPLE}. Extras will be dropped.`,
          ),
        );
      }
      for (const [key, value] of entries) {
        if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
          diagnostics.push(
            warn(
              'landing-env-example-key',
              `landing.envExample["${key}"] should be SCREAMING_SNAKE_CASE (env var convention).`,
            ),
          );
        }
        if (typeof value !== 'string') {
          diagnostics.push(
            error(
              'landing-env-example-value',
              `landing.envExample["${key}"] must be a string — got ${typeof value}.`,
            ),
          );
        }
      }
    }
  }

  // theme.accent
  if (l.theme != null) {
    if (typeof l.theme !== 'object' || Array.isArray(l.theme)) {
      diagnostics.push(error('landing-theme-type', 'landing.theme must be a plain object.'));
    } else {
      const theme = l.theme as Record<string, unknown>;
      if (theme.accent != null) {
        if (typeof theme.accent !== 'string') {
          diagnostics.push(error('landing-theme-accent', 'landing.theme.accent must be a string.'));
        } else if (!isSafeCssColor(theme.accent)) {
          diagnostics.push(
            error(
              'landing-theme-accent-format',
              `landing.theme.accent ${JSON.stringify(theme.accent)} is not a recognized CSS color. Use a hex literal (#6366f1), named color (indigo), or functional form (rgb(...), oklch(...), color-mix(...)). Values containing ; { } < > \\ or CSS comments are rejected.`,
            ),
          );
        }
      }
    }
  }

  return diagnostics;
}
