/**
 * @fileoverview Reusable render primitives shared across landing page sections —
 * annotation pills, section headings, copy-enabled code snippets, and the
 * framework attribution badge.
 *
 * @module src/mcp-server/transports/http/landing-page/primitives
 */

import type { ServerManifest } from '@/core/serverManifest.js';
import { html, type SafeHtml } from '@/utils/formatting/html.js';

/**
 * shields.io-style bi-part badge: "Built on" label + framework name. Links to
 * the framework's npm page. Lives in the hero when `landing.attribution` is
 * enabled.
 */
export function renderFrameworkBadge(framework: ServerManifest['framework']): SafeHtml {
  const npmUrl = `https://www.npmjs.com/package/${encodeURIComponent(framework.name)}`;
  return html`<a class="badge-shield" href="${npmUrl}" rel="noopener" aria-label="Built on ${framework.name} v${framework.version}"><span class="badge-shield-label">Built on</span><span class="badge-shield-value">${framework.name} v${framework.version}</span></a>`;
}

export function renderPill(text: string, variant: string): SafeHtml {
  return html`<span class="pill pill-${variant}">${text}</span>`;
}

export function renderSectionHeading(id: string, label: string, count: number): SafeHtml {
  return html`
    <div class="section-heading">
      <h2 id="${id}">${label}</h2>
      <span class="section-count" aria-label="${String(count)} ${label}">${String(count)}</span>
    </div>
  `;
}

export function renderSnippet(id: string, text: string): SafeHtml {
  const targetId = `snippet-${id}`;
  return html`
    <div class="snippet">
      <pre id="${targetId}"><code>${text}</code></pre>
      <button type="button" class="snippet-copy" data-copy data-copy-target="#${targetId}" aria-label="Copy">Copy</button>
    </div>
  `;
}
