/**
 * @fileoverview Single-row dim footer with separator-dot-delimited links.
 * Merges user-supplied `landing.links` with an auto-derived GitHub cluster
 * (changelog, release tag, issues, source), an npm link when published, and
 * the framework attribution when `landing.attribution` is enabled.
 *
 * @module src/mcp-server/transports/http/landing-page/sections/footer
 */

import type { ServerManifest } from '@/core/serverManifest.js';
import { html, type SafeHtml } from '@/utils/formatting/html.js';

export function renderFooter(manifest: ServerManifest): SafeHtml {
  const { landing, framework } = manifest;
  const links: Array<{ href: string; label: string }> = [];

  // User-supplied links
  for (const link of landing.links) {
    links.push({ href: link.href, label: link.label });
  }

  // Auto-derived GitHub cluster
  if (landing.repoRoot) {
    const repo = landing.repoRoot;
    const version = manifest.server.version;
    links.push({
      href: landing.changelogUrl ?? `${repo.url}/blob/main/CHANGELOG.md`,
      label: 'Changelog',
    });
    links.push({
      href: `${repo.url}/releases/tag/v${version}`,
      label: `v${version}`,
    });
    links.push({ href: `${repo.url}/issues`, label: 'Issues' });
    links.push({ href: repo.url, label: 'Source' });
  }

  // Package / registry
  if (landing.npmPackage) {
    links.push({ href: landing.npmPackage.url, label: 'npm' });
  }

  const frameworkNpm = `https://www.npmjs.com/package/${encodeURIComponent(framework.name)}`;

  const linkEls = links.map(
    (l, i) =>
      html`${i > 0 ? html`<span class="footer-sep">·</span>` : html``}<a href="${l.href}" rel="noopener">${l.label}</a>`,
  );

  const attribution = landing.attribution
    ? html`<span class="footer-attrib">built on <a href="${framework.homepage}">${framework.name}</a> v${framework.version} · <a href="${frameworkNpm}" rel="noopener">npm</a></span>`
    : html``;

  return html`
    <footer>
      ${linkEls}
      <span class="footer-spacer"></span>
      ${attribution}
    </footer>
  `;
}
