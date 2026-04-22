/**
 * @fileoverview Hero section — eyebrow, optional logo, display-size server
 * name, version + pre-release chips, tagline, status strip, terminal-chrome
 * connect card, and framework attribution pill. The connect card is omitted
 * in degraded (unauth) mode.
 *
 * @module src/mcp-server/transports/http/landing-page/sections/hero
 */

import type { ServerManifest } from '@/core/serverManifest.js';
import { html, type SafeHtml } from '@/utils/formatting/html.js';

import { renderFrameworkBadge } from '../primitives.js';
import { renderConnectSnippets } from './connect.js';
import { renderStatusStrip } from './status-strip.js';

export function renderHero(manifest: ServerManifest, baseUrl: string, degraded: boolean): SafeHtml {
  const { server, landing } = manifest;
  const releaseUrl = landing.repoRoot
    ? `${landing.repoRoot.url}/releases/tag/v${server.version}`
    : undefined;

  const versionBadge = releaseUrl
    ? html`<a class="badge-version" href="${releaseUrl}" aria-label="v${server.version} release notes">v${server.version}</a>`
    : html`<span class="badge-version">v${server.version}</span>`;

  const preReleaseBadge = landing.preRelease.isPreRelease
    ? html`<span class="badge-pre">${landing.preRelease.label ?? 'pre-release'}</span>`
    : html``;

  const tagline = landing.tagline ?? server.description ?? '';
  const logo = landing.logo
    ? html`<img class="hero-logo" src="${landing.logo}" alt="" aria-hidden="true" />`
    : html``;

  const frameworkBadge = landing.attribution
    ? html`<div class="hero-badges">${renderFrameworkBadge(manifest.framework)}</div>`
    : html``;

  const connect = degraded ? html`` : renderConnectSnippets(manifest, baseUrl);

  return html`
    <header class="hero">
      <span class="hero-eyebrow" aria-hidden="true">MCP Server</span>
      <div class="hero-title-row">
        ${logo}
        <h1 class="hero-heading">${server.name}</h1>
        ${versionBadge}
        ${preReleaseBadge}
      </div>
      ${tagline ? html`<p class="hero-tagline">${tagline}</p>` : html``}
      ${renderStatusStrip(manifest, degraded)}
      ${connect}
      ${frameworkBadge}
    </header>
  `;
}
