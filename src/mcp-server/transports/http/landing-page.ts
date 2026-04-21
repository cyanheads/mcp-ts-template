/**
 * @fileoverview HTML landing page served at `GET /`. Self-contained,
 * zero-dependency renderer producing a branded, a11y-conscious,
 * `prefers-color-scheme`-aware page from the shared `ServerManifest`.
 *
 * The page is the human-facing sibling of `/mcp` (bespoke JSON) and
 * `/.well-known/mcp.json` (SEP-1649 Server Card). Framework owns the design
 * system; servers supply content through `LandingConfig`.
 *
 * ## Surfaces
 *
 * - Hero — name, clickable version badge, pre-release pill, tagline, logo,
 *   auth-status banner, copy-to-clipboard connect snippets
 * - Tools section — counts in header; auto-grouped by shared prefix; per-card
 *   annotations, invocation snippet, view-source link, schema preview
 * - Resources section — URI template, mime type, description, view-source link
 * - Prompts section — args list, view-source link
 * - Extensions section — rendered when SEP-2133 extensions are present
 * - Footer — configured links + auto-derived GitHub cluster + npm/registry +
 *   attribution
 *
 * @module src/mcp-server/transports/http/landing-page
 */

import type { Context } from 'hono';

import type {
  ManifestAuth,
  ManifestLanding,
  ManifestPrompt,
  ManifestResource,
  ManifestTool,
  ServerManifest,
} from '@/core/serverManifest.js';
import { escapeHtml, html, type SafeHtml, unsafeRaw } from '@/utils/formatting/html.js';
import { logger } from '@/utils/internal/logger.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

// ---------------------------------------------------------------------------
// Tokens — inlined once per page
// ---------------------------------------------------------------------------

/** Single inlined `<style>` block. No external CSS, no fonts. */
function renderTokens(accent: string): SafeHtml {
  const safeAccent = escapeHtml(accent);
  const css = `
:root {
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;
  --space-12: 48px; --space-16: 64px;

  --text-xs: 0.75rem; --text-sm: 0.875rem; --text-base: 1rem;
  --text-lg: 1.125rem; --text-xl: 1.25rem; --text-2xl: 1.5rem;
  --text-3xl: 1.875rem; --text-4xl: 2.25rem;

  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-pill: 999px;

  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

  --duration-fast: 120ms; --duration-base: 200ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);

  --accent: ${safeAccent};
  --accent-fg: color-mix(in oklab, ${safeAccent}, white 85%);
  --accent-hover: color-mix(in oklab, ${safeAccent}, black 12%);
  --accent-soft: color-mix(in oklab, ${safeAccent}, transparent 86%);

  --bg: #ffffff;
  --bg-subtle: #f6f8fa;
  --bg-elevated: #ffffff;
  --fg: #1f2328;
  --fg-muted: #656d76;
  --fg-subtle: #8c959f;
  --border: #d0d7de;
  --border-subtle: #eaeef2;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.04);
  --shadow-md: 0 4px 16px -4px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.04);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --bg-subtle: #161b22;
    --bg-elevated: #161b22;
    --fg: #e6edf3;
    --fg-muted: #8d96a0;
    --fg-subtle: #6e7681;
    --border: #30363d;
    --border-subtle: #21262d;
    --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.3);
    --shadow-md: 0 4px 16px -4px rgb(0 0 0 / 0.4), 0 1px 2px rgb(0 0 0 / 0.2);
    --accent-fg: color-mix(in oklab, ${safeAccent}, white 10%);
  }
}

*, *::before, *::after { box-sizing: border-box; }

html { color-scheme: light dark; }

body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--fg);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

::selection { background: var(--accent-soft); color: var(--fg); }

main { max-width: 960px; margin: 0 auto; padding: var(--space-8) var(--space-6) var(--space-16); }

a {
  color: var(--accent);
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-out);
}
a:hover { color: var(--accent-hover); text-decoration: underline; }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 2px; }

code, pre {
  font-family: var(--font-mono);
  font-size: 0.85em;
}
code { background: var(--bg-subtle); padding: 0.15em 0.35em; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); }
pre {
  background: var(--bg-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin: 0;
  overflow-x: auto;
  line-height: 1.5;
  white-space: pre;
}
pre code { background: transparent; padding: 0; border: 0; }

.hero { padding: var(--space-10) 0 var(--space-8); border-bottom: 1px solid var(--border-subtle); }
.hero-top { display: flex; align-items: flex-start; gap: var(--space-4); margin-bottom: var(--space-4); }
.hero-logo { width: 56px; height: 56px; border-radius: var(--radius-md); object-fit: contain; background: var(--bg-subtle); border: 1px solid var(--border-subtle); flex-shrink: 0; }
.hero-identity { flex: 1; min-width: 0; }
.hero-heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-3); margin: 0; font-size: var(--text-3xl); font-weight: 700; letter-spacing: -0.02em; color: var(--fg); }
.hero-tagline { margin: var(--space-3) 0 0; color: var(--fg-muted); font-size: var(--text-lg); max-width: 60ch; }

.badge {
  display: inline-flex; align-items: center; gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1.4;
  border: 1px solid var(--border);
  color: var(--fg-muted);
  background: var(--bg-subtle);
  text-decoration: none;
  white-space: nowrap;
}
.badge-version { color: var(--accent); border-color: var(--accent-soft); background: var(--accent-soft); font-weight: 600; }
.badge-version:hover { background: color-mix(in oklab, var(--accent), transparent 75%); text-decoration: none; }
.badge-pre { background: color-mix(in oklab, #f59e0b, transparent 85%); border-color: color-mix(in oklab, #f59e0b, transparent 60%); color: #b45309; }
@media (prefers-color-scheme: dark) { .badge-pre { color: #fbbf24; } }

.hero-badges { margin-top: var(--space-4); display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }

.badge-shield {
  display: inline-flex;
  align-items: stretch;
  border-radius: var(--radius-sm);
  overflow: hidden;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.01em;
  text-decoration: none;
  font-family: var(--font-sans);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.04), 0 1px 1px rgb(0 0 0 / 0.04);
  transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.badge-shield:hover { text-decoration: none; transform: translateY(-1px); box-shadow: 0 0 0 1px rgb(0 0 0 / 0.08), 0 2px 4px rgb(0 0 0 / 0.08); }
.badge-shield-label, .badge-shield-value { padding: 3px var(--space-2); white-space: nowrap; }
.badge-shield-label { background: #555; color: #fff; }
.badge-shield-value { background: #2259c9; color: #fff; }
@media (prefers-color-scheme: dark) {
  .badge-shield-label { background: #3a3a3a; }
  .badge-shield-value { background: #3b6fd4; }
}

.auth-banner {
  margin: var(--space-5) 0 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-subtle);
  color: var(--fg-muted);
  font-size: var(--text-sm);
  display: flex; align-items: center; gap: var(--space-2);
}
.auth-banner-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.auth-banner-public .auth-banner-dot { background: #22c55e; }
.auth-banner-gated .auth-banner-dot { background: var(--accent); }

section { padding: var(--space-10) 0 0; }
.section-heading { display: flex; align-items: baseline; gap: var(--space-3); margin: 0 0 var(--space-6); }
.section-heading h2 { margin: 0; font-size: var(--text-2xl); font-weight: 600; letter-spacing: -0.01em; }
.section-count { color: var(--fg-subtle); font-size: var(--text-sm); font-variant-numeric: tabular-nums; font-weight: 500; }

.group-heading { margin: var(--space-6) 0 var(--space-3); color: var(--fg-muted); font-size: var(--text-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
.group-heading:first-child { margin-top: 0; }

.card {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  margin-bottom: var(--space-3);
  background: var(--bg-elevated);
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.card:hover { border-color: var(--border); box-shadow: var(--shadow-sm); }
.card-head { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-2); }
.card-title { margin: 0; font-size: var(--text-base); font-weight: 600; font-family: var(--font-mono); color: var(--fg); }
.card-title a { color: inherit; }
.card-desc { margin: 0; color: var(--fg-muted); font-size: var(--text-sm); }
.card-meta { margin-top: var(--space-3); display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); font-size: var(--text-xs); color: var(--fg-muted); align-items: center; }
.card-meta-label { color: var(--fg-subtle); }
.card-meta code { font-size: 0.9em; }

.pill-row { display: inline-flex; flex-wrap: wrap; gap: var(--space-1); }
.pill {
  display: inline-flex; align-items: center;
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.5;
  border: 1px solid var(--border-subtle);
  color: var(--fg-muted);
  background: var(--bg-subtle);
}
.pill-readonly { color: #16a34a; border-color: color-mix(in oklab, #16a34a, transparent 70%); background: color-mix(in oklab, #16a34a, transparent 90%); }
.pill-destructive { color: #dc2626; border-color: color-mix(in oklab, #dc2626, transparent 70%); background: color-mix(in oklab, #dc2626, transparent 90%); }
.pill-openworld { color: #2563eb; border-color: color-mix(in oklab, #2563eb, transparent 70%); background: color-mix(in oklab, #2563eb, transparent 90%); }
.pill-task { color: var(--accent); border-color: var(--accent-soft); background: var(--accent-soft); }
.pill-app { color: #9333ea; border-color: color-mix(in oklab, #9333ea, transparent 70%); background: color-mix(in oklab, #9333ea, transparent 90%); }
.pill-auth { color: var(--fg-muted); font-family: var(--font-mono); font-size: 0.65rem; }

.snippet { position: relative; margin-top: var(--space-3); }
.snippet pre { padding-right: var(--space-12); font-size: 0.8rem; }
.snippet-copy {
  position: absolute; top: var(--space-2); right: var(--space-2);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--fg-muted);
  cursor: pointer;
  transition: color var(--duration-fast), border-color var(--duration-fast);
}
.snippet-copy:hover { color: var(--accent); border-color: var(--accent); }
.snippet-copy:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.snippet-copy[data-copied="true"] { color: #16a34a; border-color: #16a34a; }

details { margin-top: var(--space-3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
details > summary {
  cursor: pointer;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
  color: var(--fg-muted);
  list-style: none;
  user-select: none;
  transition: background var(--duration-fast);
}
details > summary::-webkit-details-marker { display: none; }
details > summary:hover { background: var(--bg-subtle); color: var(--fg); }
details > summary::before { content: "▸ "; margin-right: 4px; transition: transform var(--duration-fast); display: inline-block; color: var(--fg-subtle); }
details[open] > summary::before { transform: rotate(90deg); }
details[open] > summary { border-bottom: 1px solid var(--border-subtle); }
details > pre { border: 0; border-radius: 0 0 var(--radius-md) var(--radius-md); margin: 0; }

.connect-tabs { display: flex; gap: var(--space-1); margin-top: var(--space-4); border-bottom: 1px solid var(--border-subtle); }
.connect-tab-input { position: absolute; opacity: 0; pointer-events: none; }
.connect-tab-label {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  color: var(--fg-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color var(--duration-fast), border-color var(--duration-fast);
}
.connect-tab-label:hover { color: var(--fg); }
.connect-tab-input:focus-visible + .connect-tab-label { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--radius-sm); }
.connect-panels { position: relative; margin-top: var(--space-3); }
.connect-panel { display: none; }
.connect-tab-input:checked + .connect-tab-label { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
${[0, 1, 2]
  .map(
    (i) =>
      `.connect-tab-input:nth-of-type(${i + 1}):checked ~ .connect-panels .connect-panel:nth-child(${i + 1}) { display: block; }`,
  )
  .join('\n')}

footer {
  margin-top: var(--space-16);
  padding: var(--space-8) 0 var(--space-6);
  border-top: 1px solid var(--border-subtle);
  font-size: var(--text-sm);
  color: var(--fg-muted);
}
.footer-links { display: flex; flex-wrap: wrap; gap: var(--space-4) var(--space-6); margin-bottom: var(--space-4); }
.footer-group { display: flex; flex-direction: column; gap: var(--space-2); min-width: 140px; }
.footer-group-label { color: var(--fg-subtle); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
.footer-attrib { font-size: var(--text-xs); color: var(--fg-subtle); }
.footer-attrib a { color: inherit; text-decoration: underline; text-decoration-color: var(--border); }
.footer-attrib a:hover { color: var(--accent); text-decoration-color: var(--accent); }

.source-link { font-size: var(--text-xs); color: var(--fg-muted); margin-left: auto; }
.source-link:hover { color: var(--accent); }

.args-list { list-style: none; padding: 0; margin: var(--space-3) 0 0; display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-sm); }
.args-list code { font-size: 0.85em; }
.args-required { color: var(--accent); font-size: 0.7rem; font-weight: 600; margin-left: var(--space-1); }

.ext-card { background: var(--bg-subtle); border-color: var(--border-subtle); }
.ext-key { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg); }
.ext-preview { margin-top: var(--space-2); font-size: var(--text-xs); color: var(--fg-muted); }

.empty-state { padding: var(--space-8); text-align: center; color: var(--fg-muted); border: 1px dashed var(--border); border-radius: var(--radius-md); }

@media (max-width: 640px) {
  main { padding: var(--space-5) var(--space-4) var(--space-12); }
  .hero-heading { font-size: var(--text-2xl); }
  .hero-top { flex-direction: column; gap: var(--space-3); }
  .hero-logo { width: 48px; height: 48px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
`;
  return unsafeRaw(`<style>${css}</style>`);
}

// ---------------------------------------------------------------------------
// Copy-to-clipboard — single inlined script, < 1KB
// ---------------------------------------------------------------------------

function renderCopyScript(): SafeHtml {
  // Works without JS too — the button is inert but the pre/code is still selectable.
  // `data-copy-target` holds a CSS selector or inline text content.
  const js = `
document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-copy]');
  if (!btn) return;
  var selector = btn.getAttribute('data-copy-target');
  var text = '';
  if (selector) {
    var node = document.querySelector(selector);
    if (node) text = node.textContent || '';
  } else {
    text = btn.getAttribute('data-copy') || '';
  }
  if (!text || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(function() {
    var prev = btn.textContent;
    btn.setAttribute('data-copied', 'true');
    btn.textContent = 'Copied';
    setTimeout(function() {
      btn.removeAttribute('data-copied');
      btn.textContent = prev;
    }, 1500);
  });
});`;
  return unsafeRaw(`<script>${js}</script>`);
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function renderBadge(label: string, variant?: 'version' | 'pre', href?: string): SafeHtml {
  const cls =
    variant === 'version' ? 'badge badge-version' : variant === 'pre' ? 'badge badge-pre' : 'badge';
  if (href) {
    return html`<a class="${cls}" href="${href}">${label}</a>`;
  }
  return html`<span class="${cls}">${label}</span>`;
}

/**
 * shields.io-style bi-part badge: grey "Built on" label + accent framework name.
 * Links to the framework's npm page for discoverability. Lives in the hero
 * badge strip when `landing.attribution` is enabled.
 */
function renderFrameworkBadge(framework: ServerManifest['framework']): SafeHtml {
  const npmUrl = `https://www.npmjs.com/package/${encodeURIComponent(framework.name)}`;
  return html`<a class="badge-shield" href="${npmUrl}" rel="noopener" aria-label="Built on ${framework.name} v${framework.version}"><span class="badge-shield-label">Built on</span><span class="badge-shield-value">${framework.name} v${framework.version}</span></a>`;
}

function renderPill(text: string, variant: string): SafeHtml {
  return html`<span class="pill pill-${variant}">${text}</span>`;
}

function renderAuthBanner(auth: ManifestAuth): SafeHtml {
  if (auth.mode === 'none') {
    return html`<div class="auth-banner auth-banner-public" role="status"><span class="auth-banner-dot" aria-hidden="true"></span><span>Public access — no authentication required.</span></div>`;
  }
  if (auth.mode === 'jwt') {
    return html`<div class="auth-banner auth-banner-gated" role="status"><span class="auth-banner-dot" aria-hidden="true"></span><span>Requires a bearer token.</span></div>`;
  }
  // oauth
  const issuer = auth.oauthIssuer ? html` <a href="${auth.oauthIssuer}">Sign in ↗</a>` : html``;
  return html`<div class="auth-banner auth-banner-gated" role="status"><span class="auth-banner-dot" aria-hidden="true"></span><span>Requires OAuth.${issuer}</span></div>`;
}

function renderSectionHeading(id: string, label: string, count: number): SafeHtml {
  return html`
    <div class="section-heading">
      <h2 id="${id}">${label}</h2>
      <span class="section-count" aria-label="${String(count)} ${label.toLowerCase()}">(${count})</span>
    </div>
  `;
}

function renderSnippet(id: string, text: string, variant = 'code'): SafeHtml {
  const targetId = `snippet-${id}`;
  return html`
    <div class="snippet">
      <pre id="${targetId}" class="snippet-${variant}"><code>${text}</code></pre>
      <button type="button" class="snippet-copy" data-copy data-copy-target="#${targetId}" aria-label="Copy">Copy</button>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function renderHero(manifest: ServerManifest, baseUrl: string): SafeHtml {
  const { server, landing } = manifest;
  const releaseUrl = landing.repoRoot
    ? `${landing.repoRoot.url}/releases/tag/v${server.version}`
    : undefined;
  const versionBadge = renderBadge(`v${server.version}`, 'version', releaseUrl);
  const preReleaseBadge = landing.preRelease.isPreRelease
    ? renderBadge(landing.preRelease.label ?? 'pre-release', 'pre')
    : html``;
  const tagline = landing.tagline ?? server.description ?? '';
  const logo = landing.logo
    ? html`<img class="hero-logo" src="${landing.logo}" alt="" aria-hidden="true" />`
    : html``;

  const frameworkBadge = landing.attribution
    ? html`<div class="hero-badges">${renderFrameworkBadge(manifest.framework)}</div>`
    : html``;

  return html`
    <header class="hero">
      <div class="hero-top">
        ${logo}
        <div class="hero-identity">
          <h1 class="hero-heading">
            <span>${server.name}</span>
            ${versionBadge}
            ${preReleaseBadge}
          </h1>
          ${tagline ? html`<p class="hero-tagline">${tagline}</p>` : html``}
          ${frameworkBadge}
        </div>
      </div>
      ${renderAuthBanner(manifest.auth)}
      ${renderConnectSnippets(manifest, baseUrl)}
    </header>
  `;
}

function renderConnectSnippets(manifest: ServerManifest, baseUrl: string): SafeHtml {
  const endpoint = `${baseUrl.replace(/\/$/, '')}${manifest.transport.endpointPath}`;
  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        [manifest.server.name]: {
          type: 'http',
          url: endpoint,
        },
      },
    },
    null,
    2,
  );
  const mcpRemoteConfig = JSON.stringify(
    {
      mcpServers: {
        [manifest.server.name]: {
          command: 'npx',
          args: ['-y', 'mcp-remote', endpoint],
        },
      },
    },
    null,
    2,
  );
  const curl = [
    `curl -X POST ${endpoint} \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "MCP-Protocol-Version: ${manifest.protocol.latestVersion}" \\`,
    `  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"${manifest.protocol.latestVersion}","capabilities":{},"clientInfo":{"name":"curl","version":"1.0.0"}}}'`,
  ].join('\n');

  // Radio-hack tabs — no JS required for tab switching.
  return html`
    <div class="connect-tabs" role="tablist" aria-label="Connection snippets">
      <input type="radio" class="connect-tab-input" name="connect" id="connect-tab-http" checked />
      <label for="connect-tab-http" class="connect-tab-label" role="tab">HTTP client</label>
      <input type="radio" class="connect-tab-input" name="connect" id="connect-tab-remote" />
      <label for="connect-tab-remote" class="connect-tab-label" role="tab">mcp-remote (stdio)</label>
      <input type="radio" class="connect-tab-input" name="connect" id="connect-tab-curl" />
      <label for="connect-tab-curl" class="connect-tab-label" role="tab">curl</label>
      <div class="connect-panels">
        <div class="connect-panel" role="tabpanel">${renderSnippet('http', claudeDesktopConfig)}</div>
        <div class="connect-panel" role="tabpanel">${renderSnippet('remote', mcpRemoteConfig)}</div>
        <div class="connect-panel" role="tabpanel">${renderSnippet('curl', curl)}</div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Tools section
// ---------------------------------------------------------------------------

function groupToolsByPrefix(
  tools: ManifestTool[],
): Array<{ label: string | null; tools: ManifestTool[] }> {
  if (tools.length < 3) return [{ label: null, tools }];

  // Count first-segment prefixes. A prefix earns a group when >= 2 tools share it.
  const prefixCounts = new Map<string, number>();
  for (const tool of tools) {
    const prefix = tool.name.split('_', 1)[0];
    if (!prefix) continue;
    prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
  }

  const groupablePrefixes = new Set(
    [...prefixCounts.entries()].filter(([, count]) => count >= 2).map(([p]) => p),
  );

  if (groupablePrefixes.size === 0) return [{ label: null, tools }];

  // Preserve encounter order; create one group per qualifying prefix plus "Other".
  const groups = new Map<string, ManifestTool[]>();
  const other: ManifestTool[] = [];
  for (const tool of tools) {
    const prefix = tool.name.split('_', 1)[0];
    if (prefix && groupablePrefixes.has(prefix)) {
      const list = groups.get(prefix) ?? [];
      list.push(tool);
      groups.set(prefix, list);
    } else {
      other.push(tool);
    }
  }

  const out: Array<{ label: string | null; tools: ManifestTool[] }> = [];
  for (const [prefix, list] of groups) {
    out.push({ label: titleCase(prefix), tools: list });
  }
  if (other.length > 0) out.push({ label: 'Other', tools: other });
  return out;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildInvocationSnippet(tool: ManifestTool): string {
  const args: Record<string, unknown> = {};
  for (const field of tool.requiredFields) {
    args[field] = `<${field}>`;
  }
  return JSON.stringify(
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: tool.name,
        arguments: args,
      },
    },
    null,
    2,
  );
}

function renderToolCard(tool: ManifestTool): SafeHtml {
  const anchor = `tool-${tool.name}`;
  const annotations = tool.annotations as
    | { readOnlyHint?: boolean; destructiveHint?: boolean; openWorldHint?: boolean }
    | undefined;
  const pills: SafeHtml[] = [];
  if (annotations?.readOnlyHint) pills.push(renderPill('read-only', 'readonly'));
  if (annotations?.destructiveHint === true) pills.push(renderPill('destructive', 'destructive'));
  if (annotations?.openWorldHint) pills.push(renderPill('open-world', 'openworld'));
  if (tool.isTask) pills.push(renderPill('task', 'task'));
  if (tool.isApp) pills.push(renderPill('app', 'app'));

  const source = tool.sourceUrl
    ? html`<a class="source-link" href="${tool.sourceUrl}" rel="noopener">view source ↗</a>`
    : html``;

  const schemaPreview = tool.inputSchema
    ? html`
        <details>
          <summary>Input schema</summary>
          <pre><code>${JSON.stringify(tool.inputSchema, null, 2)}</code></pre>
        </details>
      `
    : html``;

  const invocation = buildInvocationSnippet(tool);
  const authBadges =
    tool.auth && tool.auth.length > 0
      ? html`<div class="card-meta"><span class="card-meta-label">scopes:</span>${tool.auth.map((scope) => html` <span class="pill pill-auth">${scope}</span>`)}</div>`
      : html``;

  return html`
    <article class="card" id="${anchor}">
      <div class="card-head">
        <h3 class="card-title"><a href="#${anchor}">${tool.name}</a></h3>
        <div class="pill-row" role="list">${pills}</div>
        ${source}
      </div>
      <p class="card-desc">${tool.description}</p>
      ${authBadges}
      ${renderSnippet(`tool-${tool.name}`, invocation)}
      ${schemaPreview}
    </article>
  `;
}

function renderToolsSection(tools: ManifestTool[]): SafeHtml {
  if (tools.length === 0) return html``;
  const groups = groupToolsByPrefix(tools);
  const body = groups.map((group) => {
    const heading = group.label ? html`<h4 class="group-heading">${group.label}</h4>` : html``;
    return html`${heading}${group.tools.map(renderToolCard)}`;
  });

  return html`
    <section aria-labelledby="section-tools">
      ${renderSectionHeading('section-tools', 'Tools', tools.length)}
      ${body}
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Resources section
// ---------------------------------------------------------------------------

function slugifyUri(template: string): string {
  return template
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function renderResourceCard(resource: ManifestResource): SafeHtml {
  const anchor = `resource-${slugifyUri(resource.uriTemplate || resource.name)}`;
  const source = resource.sourceUrl
    ? html`<a class="source-link" href="${resource.sourceUrl}" rel="noopener">view source ↗</a>`
    : html``;

  return html`
    <article class="card" id="${anchor}">
      <div class="card-head">
        <h3 class="card-title"><a href="#${anchor}">${resource.name}</a></h3>
        ${source}
      </div>
      <p class="card-desc">${resource.description}</p>
      <div class="card-meta">
        <span><span class="card-meta-label">uri:</span> <code>${resource.uriTemplate}</code></span>
        ${resource.mimeType ? html`<span><span class="card-meta-label">mime:</span> <code>${resource.mimeType}</code></span>` : html``}
      </div>
    </article>
  `;
}

function renderResourcesSection(resources: ManifestResource[]): SafeHtml {
  if (resources.length === 0) return html``;
  return html`
    <section aria-labelledby="section-resources">
      ${renderSectionHeading('section-resources', 'Resources', resources.length)}
      ${resources.map(renderResourceCard)}
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Prompts section
// ---------------------------------------------------------------------------

function renderPromptCard(prompt: ManifestPrompt): SafeHtml {
  const anchor = `prompt-${prompt.name}`;
  const source = prompt.sourceUrl
    ? html`<a class="source-link" href="${prompt.sourceUrl}" rel="noopener">view source ↗</a>`
    : html``;

  const argsList =
    prompt.args.length > 0
      ? html`
        <ul class="args-list">
          ${prompt.args.map(
            (arg) => html`
              <li>
                <code>${arg.name}</code>${
                  arg.required ? html`<span class="args-required">required</span>` : html``
                }
                ${arg.description ? html` — ${arg.description}` : html``}
              </li>
            `,
          )}
        </ul>
      `
      : html``;

  return html`
    <article class="card" id="${anchor}">
      <div class="card-head">
        <h3 class="card-title"><a href="#${anchor}">${prompt.name}</a></h3>
        ${source}
      </div>
      <p class="card-desc">${prompt.description}</p>
      ${argsList}
    </article>
  `;
}

function renderPromptsSection(prompts: ManifestPrompt[]): SafeHtml {
  if (prompts.length === 0) return html``;
  return html`
    <section aria-labelledby="section-prompts">
      ${renderSectionHeading('section-prompts', 'Prompts', prompts.length)}
      ${prompts.map(renderPromptCard)}
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Extensions section
// ---------------------------------------------------------------------------

function renderExtensionsSection(extensions: Record<string, object> | undefined): SafeHtml {
  if (!extensions || Object.keys(extensions).length === 0) return html``;
  const entries = Object.entries(extensions);
  return html`
    <section aria-labelledby="section-extensions">
      ${renderSectionHeading('section-extensions', 'Extensions', entries.length)}
      ${entries.map(
        ([key, value]) => html`
          <article class="card ext-card">
            <div class="card-head">
              <h3 class="card-title ext-key">${key}</h3>
            </div>
            <pre class="ext-preview"><code>${JSON.stringify(value, null, 2)}</code></pre>
          </article>
        `,
      )}
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function renderFooter(manifest: ServerManifest): SafeHtml {
  const { landing, framework } = manifest;
  const groups: Array<{ label: string; links: Array<{ href: string; label: string }> }> = [];

  // User-supplied links
  if (landing.links.length > 0) {
    groups.push({
      label: 'Links',
      links: landing.links.map((l) => ({ href: l.href, label: l.label })),
    });
  }

  // Auto-derived GitHub cluster
  if (landing.repoRoot) {
    const repo = landing.repoRoot;
    const version = manifest.server.version;
    groups.push({
      label: 'Repository',
      links: [
        { href: landing.changelogUrl ?? `${repo.url}/blob/main/CHANGELOG.md`, label: 'Changelog' },
        { href: `${repo.url}/releases/tag/v${version}`, label: `Release v${version}` },
        { href: `${repo.url}/issues`, label: 'Issues' },
        { href: repo.url, label: 'Source' },
      ],
    });
  }

  // Package / registry
  if (landing.npmPackage) {
    groups.push({
      label: 'Registry',
      links: [{ href: landing.npmPackage.url, label: `npm: ${landing.npmPackage.name}` }],
    });
  }

  const groupsHtml = groups.map(
    (g) => html`
      <div class="footer-group">
        <span class="footer-group-label">${g.label}</span>
        ${g.links.map((l) => html`<a href="${l.href}" rel="noopener">${l.label}</a>`)}
      </div>
    `,
  );

  const frameworkNpm = `https://www.npmjs.com/package/${encodeURIComponent(framework.name)}`;
  const attribution = landing.attribution
    ? html`<p class="footer-attrib">Built on <a href="${framework.homepage}">${framework.name}</a> v${framework.version} · <a href="${frameworkNpm}" rel="noopener">npm</a></p>`
    : html``;

  return html`
    <footer>
      ${groups.length > 0 ? html`<div class="footer-links">${groupsHtml}</div>` : html``}
      ${attribution}
    </footer>
  `;
}

// ---------------------------------------------------------------------------
// <head> metadata
// ---------------------------------------------------------------------------

function renderHead(manifest: ServerManifest, pageUrl: string): SafeHtml {
  const { server, landing } = manifest;
  const title = `${server.name} · MCP server`;
  const description = landing.tagline ?? server.description ?? `MCP server: ${server.name}`;
  const ogImage = landing.logo?.startsWith('http')
    ? html`<meta property="og:image" content="${landing.logo}" />`
    : html``;
  const favicon =
    landing.logo && isImageDataUri(landing.logo)
      ? html`<link rel="icon" href="${landing.logo}" />`
      : html``;

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: server.name,
    description,
    applicationCategory: 'DeveloperApplication',
    softwareVersion: server.version,
    ...(server.homepage && { url: server.homepage }),
  });

  return html`
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${pageUrl}" />
    ${ogImage}
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${favicon}
    <link rel="mcp-endpoint" href="${manifest.transport.endpointPath}" />
    <link rel="alternate" type="application/json" href="/.well-known/mcp.json" title="MCP Server Card" />
    <script type="application/ld+json">${unsafeRaw(escapeLdJson(jsonLd))}</script>
  `;
}

function isImageDataUri(value: string | undefined): boolean {
  if (!value) return false;
  return /^data:image\/(png|svg\+xml|jpeg|gif|webp|x-icon|vnd\.microsoft\.icon)/i.test(value);
}

/**
 * Escape a JSON string for safe embedding inside `<script type="application/ld+json">`.
 * Replaces HTML-sensitive characters with Unicode escapes — `<` → `<`,
 * `>` → `>`, `&` → `&`, U+2028/U+2029 line terminators → escaped.
 * Matches the hardening recommendation in https://html.spec.whatwg.org/#script-data-state.
 */
function escapeLdJson(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// ---------------------------------------------------------------------------
// Page composition
// ---------------------------------------------------------------------------

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
  const landing: ManifestLanding = manifest.landing;

  const body = degraded
    ? html`
        ${renderHero(manifest, baseUrl)}
        <section>
          <p class="empty-state">
            Full server inventory is available to authenticated callers.
          </p>
        </section>
        ${renderFooter(manifest)}
      `
    : html`
        ${renderHero(manifest, baseUrl)}
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
    ${renderTokens(landing.theme.accent)}
  </head>
  <body>
    <main>${body}</main>
    ${renderCopyScript()}
  </body>
</html>`;

  return doc.toString();
}

// ---------------------------------------------------------------------------
// Hono handler
// ---------------------------------------------------------------------------

/**
 * Factory for the `GET /` route handler.
 *
 * Cache behavior and body shape depend on `manifest.landing.requireAuth`:
 *
 * | `requireAuth` | Authenticated | Unauthenticated |
 * |:---|:---|:---|
 * | `false` (default) | full page · `Cache-Control: public, max-age=60` | full page · same |
 * | `true` | full page · `Cache-Control: private, max-age=60` · `Vary: Authorization` | reduced hero-only page · same cache headers |
 *
 * The check is header-presence based — we don't validate the bearer token
 * here (that's the MCP endpoint's job). If a caller presents any Authorization
 * header, the full inventory renders; if not, they see a stub and a pointer
 * to the docs link when available.
 */
export function createLandingPageHandler(manifest: ServerManifest) {
  return (c: Context): Response => {
    const context = requestContextService.createRequestContext({
      operation: 'landingPageHandler',
    });
    const url = new URL(c.req.url);
    const baseUrl = url.origin;

    const requireAuth = manifest.landing.requireAuth;
    const authHeader = c.req.header('authorization');
    const isAuthenticated = Boolean(authHeader && authHeader.trim().length > 0);
    const degraded = requireAuth && !isAuthenticated;

    const html = renderLandingPage(manifest, baseUrl, degraded);

    logger.debug('Serving landing page.', {
      ...context,
      accept: c.req.header('accept'),
      bytes: html.length,
      requireAuth,
      degraded,
    });

    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('X-Content-Type-Options', 'nosniff');
    if (requireAuth) {
      c.header('Cache-Control', 'private, max-age=60');
      c.header('Vary', 'Authorization');
    } else {
      c.header('Cache-Control', 'public, max-age=60');
    }
    return c.body(html);
  };
}
