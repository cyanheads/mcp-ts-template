/**
 * @fileoverview Top-level landing page composition. Stitches `<head>`,
 * hero, capability sections, and footer into a single HTML document string.
 * `degraded` collapses the body to the hero + an empty-state note when the
 * caller is unauthenticated and `landing.requireAuth` is enabled.
 *
 * @module src/mcp-server/transports/http/landing-page/render
 */

import type { ServerManifest } from '@/core/serverManifest.js';
import { html } from '@/utils/formatting/html.js';

import { renderCopyScript } from './assets/copy-script.js';
import { renderTokens } from './assets/styles.js';
import { renderExtensionsSection } from './sections/extensions.js';
import { renderFooter } from './sections/footer.js';
import { renderHead } from './sections/head.js';
import { renderHero } from './sections/hero.js';
import { renderPromptsSection } from './sections/prompts.js';
import { renderResourcesSection } from './sections/resources.js';
import { renderToolsSection } from './sections/tools.js';

/**
 * Render the full landing page. `baseUrl` is the request origin
 * (e.g. `https://pubmed.example.com`) — used in connect snippets and OG meta.
 * `degraded` reduces the body when `requireAuth` gates unauth callers.
 */
export function renderLandingPage(
  manifest: ServerManifest,
  baseUrl: string,
  degraded = false,
): string {
  const pageUrl = `${baseUrl.replace(/\/$/, '')}/`;

  const body = degraded
    ? html`
        ${renderHero(manifest, baseUrl, true)}
        <section>
          <p class="empty-state">
            Full server inventory is available to authenticated callers.
          </p>
        </section>
        ${renderFooter(manifest)}
      `
    : html`
        ${renderHero(manifest, baseUrl, false)}
        ${renderToolsSection(manifest.definitions.tools)}
        ${renderResourcesSection(manifest.definitions.resources)}
        ${renderPromptsSection(manifest.definitions.prompts)}
        ${renderExtensionsSection(manifest.extensions)}
        ${renderFooter(manifest)}
      `;

  const doc = html`<!DOCTYPE html>
<html lang="en">
  <head>
    ${renderHead(manifest, pageUrl)}
    ${renderTokens(manifest.landing.theme.accent)}
  </head>
  <body>
    <main>${body}</main>
    ${renderCopyScript()}
  </body>
</html>`;

  return doc.toString();
}
