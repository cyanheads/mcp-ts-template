/**
 * @fileoverview Single-line status strip under the hero. Communicates auth
 * mode, capability counts, and protocol version in one mono-spaced,
 * dot-separated row.
 *
 * Accessibility: the container carries an `aria-label` with the long-form
 * auth phrase ("Public access", "Requires OAuth", etc.) so assistive tech
 * reads the gated-ness even when the visible label is compact ("public",
 * "oauth"). The strip is static after initial render, so `role="status"`
 * (meant for live regions) would announce on page load as if it were a
 * change — we deliberately omit it.
 *
 * @module src/mcp-server/transports/http/landing-page/sections/status-strip
 */

import type { ManifestAuth, ServerManifest } from '@/core/serverManifest.js';
import { html, type SafeHtml } from '@/utils/formatting/html.js';

export function renderStatusStrip(manifest: ServerManifest, degraded: boolean): SafeHtml {
  const { auth, definitionCounts, protocol } = manifest;

  const authMeta = describeAuth(auth);

  // Counts hidden in degraded mode to avoid leaking inventory shape.
  const counts = degraded
    ? []
    : [
        { n: definitionCounts.tools, label: 'tools' },
        { n: definitionCounts.resources, label: 'resources' },
        { n: definitionCounts.prompts, label: 'prompts' },
      ].filter((c) => c.n > 0);

  const signin =
    auth.mode === 'oauth' && auth.oauthIssuer
      ? html` <a class="status-signin" href="${auth.oauthIssuer}" rel="noopener">sign in ↗</a>`
      : html``;

  return html`
    <div class="status-strip" aria-label="${authMeta.ariaLabel}">
      <span class="status-item" title="${authMeta.ariaLabel}">
        <span class="status-dot ${authMeta.dotClass}" aria-hidden="true"></span>
        <span class="status-value">${authMeta.label}</span>${signin}
      </span>
      ${counts.map(
        (c) => html`
          <a class="status-item status-link" href="#section-${c.label}">
            <span class="status-value">${String(c.n)}</span>
            <span>${c.label}</span>
          </a>
        `,
      )}
      <span class="status-item" title="MCP protocol version ${protocol.latestVersion}">
        <span>protocol</span>
        <span class="status-value status-value-accent">${protocol.latestVersion}</span>
      </span>
    </div>
  `;
}

/** Visible label, dot class, and long-form aria phrase for the auth strip item. */
function describeAuth(auth: ManifestAuth): {
  ariaLabel: string;
  dotClass: string;
  label: string;
} {
  if (auth.mode === 'none') {
    return {
      label: 'public',
      dotClass: 'status-dot-public',
      ariaLabel: 'Public access — no authentication required',
    };
  }
  if (auth.mode === 'jwt') {
    return {
      label: 'bearer',
      dotClass: 'status-dot-gated',
      ariaLabel: 'Requires a bearer token',
    };
  }
  return {
    label: 'oauth',
    dotClass: 'status-dot-gated',
    ariaLabel: 'Requires OAuth',
  };
}
