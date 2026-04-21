/**
 * @fileoverview Landing page configuration lint rules.
 * Enforces content limits (tagline length, logo size, link count, repoRoot
 * shape) at startup so surprising input fails loudly instead of quietly at
 * render time.
 * @module src/linter/rules/landing-rules
 */

import {
  GITHUB_REPO_ROOT_PATTERN,
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

  // theme.accent
  if (l.theme != null) {
    if (typeof l.theme !== 'object' || Array.isArray(l.theme)) {
      diagnostics.push(error('landing-theme-type', 'landing.theme must be a plain object.'));
    } else {
      const theme = l.theme as Record<string, unknown>;
      if (theme.accent != null && typeof theme.accent !== 'string') {
        diagnostics.push(error('landing-theme-accent', 'landing.theme.accent must be a string.'));
      }
    }
  }

  return diagnostics;
}
