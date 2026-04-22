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
 * - Hero — eyebrow, display-size server name, version + pre-release chips,
 *   tagline, single-line status strip, terminal-chrome connection card,
 *   framework attribution pill
 * - Tools section — responsive 2-column card grid; prefix-grouped; per-card
 *   annotation chips, invocation snippet, view-source link, schema preview
 * - Resources section — URI template, mime type, description, view-source link
 * - Prompts section — args list, view-source link
 * - Extensions section — rendered when SEP-2133 extensions are present
 * - Footer — single-row, dim, separator-dot delimited
 *
 * @module src/mcp-server/transports/http/landing-page
 */

import type { Context } from 'hono';

import type {
  ManifestAuth,
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
  --space-12: 48px; --space-16: 64px; --space-20: 80px;

  --text-xs: 0.75rem; --text-sm: 0.875rem; --text-base: 1rem;
  --text-lg: 1.125rem; --text-xl: 1.25rem; --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-display: clamp(2rem, 4.5vw + 0.5rem, 3.5rem);

  --radius-xs: 4px; --radius-sm: 6px; --radius-md: 10px;
  --radius-lg: 14px; --radius-pill: 999px;

  --font-sans: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

  --duration-fast: 120ms; --duration-base: 200ms; --duration-slow: 320ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);

  --accent: ${safeAccent};
  --accent-hover: color-mix(in oklab, ${safeAccent}, black 10%);
  --accent-edge: color-mix(in oklab, ${safeAccent}, transparent 65%);
  --accent-soft: color-mix(in oklab, ${safeAccent}, transparent 82%);
  --accent-softer: color-mix(in oklab, ${safeAccent}, transparent 92%);
  /* Secondary accent — hue-shifted companion for richer gradients. */
  /* Fallback (lighter tonal variant) first; modern relative-color value overrides on supported engines. */
  --accent-2: color-mix(in oklab, var(--accent), white 30%);
  --accent-2: oklch(from var(--accent) l c calc(h + 30));
  --accent-glow: color-mix(in oklab, var(--accent), transparent 72%);

  --bg: #fbfbfd;
  --bg-subtle: #f4f4f7;
  --bg-elevated: #ffffff;
  --bg-code: #f6f7fa;
  --fg: #09090b;
  --fg-muted: #52525b;
  --fg-subtle: #71717a;
  --border: #e4e4e7;
  --border-subtle: #ececf0;
  --border-strong: #d4d4d8;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.04);
  --shadow-md: 0 4px 20px -8px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.04);
  --grid-dot: rgb(0 0 0 / 0.045);
  --glow-strength: 0.10;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0a0b12;
    --bg-subtle: #11131a;
    --bg-elevated: #10121a;
    --bg-code: #0c0d14;
    --fg: #ededef;
    --fg-muted: #a1a1a8;
    --fg-subtle: #8a8a93;
    --border: #22232b;
    --border-subtle: #191a21;
    --border-strong: #2d2e37;
    --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.35);
    --shadow-md: 0 4px 24px -8px rgb(0 0 0 / 0.55), 0 1px 2px rgb(0 0 0 / 0.3);
    --grid-dot: rgb(255 255 255 / 0.032);
    --glow-strength: 0.17;
    --accent-glow: color-mix(in oklab, var(--accent), transparent 60%);
  }
}

*, *::before, *::after { box-sizing: border-box; }
html { color-scheme: light dark; }

body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--fg);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  position: relative;
  overflow-x: hidden;
}

/* Top accent hairline — spans viewport, dual-accent gradient. */
body::before {
  content: "";
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    color-mix(in oklab, var(--accent), transparent 60%) 12%,
    var(--accent) 35%,
    var(--accent-2) 65%,
    color-mix(in oklab, var(--accent-2), transparent 60%) 88%,
    transparent 100%);
  z-index: 100;
  pointer-events: none;
}

/* Ambient background — dual radial glow (accent top-left, accent-2 top-right) + fine dot grid. */
body::after {
  content: "";
  position: fixed;
  inset: 0;
  background-image:
    radial-gradient(ellipse 70% 55% at 12% -5%, color-mix(in oklab, var(--accent), transparent calc((1 - var(--glow-strength)) * 100%)), transparent 60%),
    radial-gradient(ellipse 55% 45% at 92% 10%, color-mix(in oklab, var(--accent-2), transparent calc((1 - var(--glow-strength)) * 115%)), transparent 55%),
    radial-gradient(circle at center, var(--grid-dot) 1px, transparent 1.5px);
  background-size: 100% 100%, 100% 100%, 24px 24px;
  pointer-events: none;
  z-index: -1;
}

::selection { background: var(--accent-soft); color: var(--fg); }

main {
  max-width: 1120px;
  margin: 0 auto;
  padding: var(--space-10) var(--space-6) var(--space-20);
  position: relative;
}

a {
  color: var(--accent);
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-out);
}
a:hover { color: var(--accent-hover); }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 2px; }

code, pre {
  font-family: var(--font-mono);
  font-size: 0.875em;
  font-feature-settings: "liga" 0, "calt" 0;
}
code {
  background: var(--bg-subtle);
  padding: 0.1em 0.35em;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border-subtle);
  font-size: 0.85em;
}
pre {
  background: var(--bg-code);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  margin: 0;
  overflow-x: auto;
  line-height: 1.55;
  white-space: pre;
  color: var(--fg);
}
pre code { background: transparent; padding: 0; border: 0; font-size: inherit; }

/* -------------------- Hero -------------------- */

.hero {
  padding: var(--space-12) 0 var(--space-10);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}
.hero-eyebrow::before {
  content: "";
  width: 5px; height: 5px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--accent);
}

.hero-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.hero-logo {
  width: 44px; height: 44px;
  border-radius: var(--radius-md);
  object-fit: contain;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  flex-shrink: 0;
}
.hero-heading {
  margin: 0;
  font-size: var(--text-display);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.02;
  color: var(--fg);
  word-break: break-word;
  flex: 1 1 auto;
  min-width: 0;
}
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .hero-heading {
    background: linear-gradient(180deg,
      color-mix(in oklab, var(--fg), var(--accent) 10%) 0%,
      var(--fg) 45%,
      color-mix(in oklab, var(--fg), transparent 22%) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }
}
.hero-tagline {
  margin: 0;
  color: var(--fg-muted);
  font-size: var(--text-lg);
  line-height: 1.5;
  max-width: 62ch;
}

/* Version + pre-release chips */
.badge-version {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--accent);
  background: var(--accent-softer);
  border: 1px solid var(--accent-edge);
  text-decoration: none;
  transition: background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
}
.badge-version:hover {
  background: var(--accent-soft);
  color: var(--accent);
  text-decoration: none;
  transform: translateY(-1px);
}
.badge-pre {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #b45309;
  background: color-mix(in oklab, #f59e0b, transparent 88%);
  border: 1px solid color-mix(in oklab, #f59e0b, transparent 65%);
}
@media (prefers-color-scheme: dark) {
  .badge-pre { color: #fbbf24; }
}

/* Status strip — single line under the tagline. */
.status-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--fg-muted);
  letter-spacing: 0.01em;
}
.status-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  position: relative;
}
.status-item + .status-item::before {
  content: "·";
  color: var(--fg-subtle);
  margin-right: var(--space-2);
  opacity: 0.7;
}
.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.status-dot-public {
  background: #22c55e;
  box-shadow: 0 0 0 3px color-mix(in oklab, #22c55e, transparent 80%);
  animation: status-pulse 2.4s ease-in-out infinite;
}
.status-dot-gated {
  background: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent), transparent 75%);
}
@keyframes status-pulse {
  0%, 100% { box-shadow: 0 0 0 3px color-mix(in oklab, #22c55e, transparent 80%); }
  50% { box-shadow: 0 0 0 6px color-mix(in oklab, #22c55e, transparent 92%); }
}
.status-value {
  color: var(--fg);
  font-weight: 500;
}
.status-value-accent {
  color: var(--accent);
}
.status-signin {
  color: var(--fg-muted);
  text-decoration: none;
  border-bottom: 1px dotted var(--fg-subtle);
}
.status-signin:hover { color: var(--accent); border-color: var(--accent); }
.status-link {
  color: inherit;
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-out);
}
.status-link .status-value { transition: color var(--duration-fast) var(--ease-out); }
.status-link:hover,
.status-link:hover .status-value { color: var(--accent); }
.status-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 2px;
}

/* -------------------- Connect card -------------------- */

/* Registered custom property enables animation of a gradient angle.
   Without @property the custom-property value would change discretely rather
   than tweening, so the beam would jump instead of sweep. Widely supported
   since 2023 — engines without it fall through to the static border. */
@property --beam-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

.connect {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  position: relative;
  isolation: isolate;
}

/* Animated conic-gradient beam sweeping the inside of the card edge. Uses the
   "mask-composite: exclude" trick to render only the outer ring. Sits just
   inside the static border so it reads as accent light traveling along the
   rim; the static border remains as a fallback for engines without
   mask-composite or @property. */
.connect::before {
  content: "";
  position: absolute;
  inset: 0;
  padding: 1.5px;
  border-radius: inherit;
  background: conic-gradient(
    from var(--beam-angle),
    transparent 0deg 40deg,
    var(--accent) 90deg,
    var(--accent-2) 160deg,
    transparent 220deg 360deg
  );
  mask:
    linear-gradient(#000, #000) content-box,
    linear-gradient(#000, #000);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
  animation: connect-beam 7s linear infinite;
  pointer-events: none;
  z-index: 1;
  opacity: 0.9;
}

@keyframes connect-beam {
  to {
    --beam-angle: 360deg;
  }
}

/* Chrome header — three dots + endpoint path */
.connect-chrome {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-subtle);
}
.connect-chrome-dots {
  display: inline-flex;
  gap: 6px;
  flex-shrink: 0;
}
.connect-chrome-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: color-mix(in oklab, var(--fg-subtle), transparent 60%);
  display: inline-block;
}
.connect-chrome-endpoint {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--fg-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* Radio-hack tabs */
.connect-tab-input { position: absolute; opacity: 0; pointer-events: none; }
.connect-tabs {
  display: flex;
  gap: 0;
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  overflow-x: auto;
  scrollbar-width: none;
}
.connect-tabs::-webkit-scrollbar { display: none; }
.connect-tab-label {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--fg-muted);
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
  white-space: nowrap;
  transition: color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out),
              background var(--duration-fast) var(--ease-out);
}
.connect-tab-label:hover { color: var(--fg); }
.connect-tab-input:checked + .connect-tab-label {
  color: var(--fg);
  font-weight: 600;
  border-bottom-color: var(--accent);
  background: linear-gradient(to top, var(--accent-softer), transparent 70%);
}
.connect-tab-input:focus-visible + .connect-tab-label {
  outline: 2px solid var(--accent);
  outline-offset: -6px;
  border-radius: var(--radius-sm);
}

.connect-panels { position: relative; padding: var(--space-5) var(--space-4); }
.connect-panel { display: none; }
.connect:has(#connect-tab-stdio:checked) .panel-stdio,
.connect:has(#connect-tab-http:checked) .panel-http,
.connect:has(#connect-tab-claude:checked) .panel-claude,
.connect:has(#connect-tab-curl:checked) .panel-curl { display: block; }
/* Fallback when :has() unsupported — show first visible panel */
@supports not selector(:has(*)) {
  .connect-panel:first-of-type { display: block; }
}
.connect-panel pre {
  padding: var(--space-4);
  padding-right: var(--space-12);
  background: var(--bg-code);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  line-height: 1.6;
}
.connect-copy {
  position: absolute;
  top: calc(var(--space-5) + 8px);
  right: calc(var(--space-4) + 8px);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--fg-muted);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  letter-spacing: 0.02em;
}
.connect-copy:hover {
  color: var(--accent);
  border-color: var(--accent-edge);
  background: var(--accent-softer);
}
.connect-copy:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.connect-copy[data-copied="true"] {
  color: #16a34a;
  border-color: color-mix(in oklab, #16a34a, transparent 60%);
  background: color-mix(in oklab, #16a34a, transparent 92%);
}

/* Framework attribution pill */
.hero-badges {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.badge-shield {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--fg-muted);
  background: var(--bg-subtle);
  border: 1px solid var(--border-subtle);
  text-decoration: none;
  transition: all var(--duration-fast) var(--ease-out);
}
.badge-shield:hover {
  color: var(--accent);
  border-color: var(--accent-edge);
  background: var(--accent-softer);
  text-decoration: none;
  transform: translateY(-1px);
}
.badge-shield-label { color: var(--fg-subtle); transition: color var(--duration-fast); }
.badge-shield-value { color: var(--fg-muted); transition: color var(--duration-fast); }
.badge-shield:hover .badge-shield-label,
.badge-shield:hover .badge-shield-value { color: var(--accent); }

/* -------------------- Sections -------------------- */

section { padding: var(--space-12) 0 0; }

.section-heading {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin: 0 0 var(--space-6);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
}
.section-heading h2 {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--fg);
  text-transform: lowercase;
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
}
.section-heading h2::before {
  content: "";
  display: inline-block;
  width: 3px;
  height: 0.9em;
  background: linear-gradient(180deg, var(--accent), var(--accent-2));
  border-radius: 2px;
  flex-shrink: 0;
}
.section-count {
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1;
}

.group-heading {
  margin: var(--space-6) 0 var(--space-3);
  color: var(--fg-muted);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.group-heading:first-child { margin-top: 0; }

/* -------------------- Cards -------------------- */

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-3);
  align-items: start;
}
.card {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  transition: border-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
  position: relative;
}
.card:hover {
  border-color: var(--accent-edge);
  transform: translateY(-1px);
  box-shadow: 0 8px 28px -12px var(--accent-glow), var(--shadow-md);
}
.card-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.card-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--fg);
  letter-spacing: -0.015em;
}
.card-title a { color: inherit; }
.card-title a:hover { color: var(--accent); text-decoration: none; }
.card-desc {
  margin: 0;
  color: var(--fg-muted);
  font-size: var(--text-sm);
  line-height: 1.5;
}
.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
  color: var(--fg-muted);
  font-family: var(--font-mono);
  align-items: center;
}
.card-meta-label { color: var(--fg-subtle); }
.card-meta code {
  font-size: 1em;
  color: var(--fg);
  background: transparent;
  border: 0;
  padding: 0;
}

/* Annotation pills — dot-chip style */
.pill-row { display: inline-flex; flex-wrap: wrap; gap: 5px; align-items: center; }
.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--fg-muted);
  background: var(--bg-subtle);
  border: 1px solid var(--border-subtle);
  letter-spacing: 0.01em;
}
.pill::before {
  content: "";
  width: 4px; height: 4px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.pill-readonly { color: #16a34a; background: color-mix(in oklab, #16a34a, transparent 92%); border-color: color-mix(in oklab, #16a34a, transparent 72%); }
.pill-destructive { color: #dc2626; background: color-mix(in oklab, #dc2626, transparent 92%); border-color: color-mix(in oklab, #dc2626, transparent 72%); }
.pill-openworld { color: #2563eb; background: color-mix(in oklab, #2563eb, transparent 92%); border-color: color-mix(in oklab, #2563eb, transparent 72%); }
.pill-task { color: var(--accent); background: var(--accent-softer); border-color: var(--accent-edge); }
.pill-app { color: #9333ea; background: color-mix(in oklab, #9333ea, transparent 92%); border-color: color-mix(in oklab, #9333ea, transparent 72%); }
.pill-auth { color: var(--fg-subtle); font-size: 0.65rem; }
.pill-auth::before { display: none; }

@media (prefers-color-scheme: dark) {
  .pill-readonly { color: #4ade80; }
  .pill-destructive { color: #f87171; }
  .pill-openworld { color: #60a5fa; }
  .pill-app { color: #c084fc; }
}

.source-link {
  font-size: var(--text-xs);
  color: var(--fg-muted);
  margin-left: auto;
  font-family: var(--font-mono);
  transition: color var(--duration-fast);
}
.source-link:hover { color: var(--accent); text-decoration: none; }

/* Inline snippet (tool invocation) */
.snippet {
  position: relative;
  margin-top: var(--space-2);
}
.snippet pre {
  padding: var(--space-3);
  padding-right: var(--space-12);
  background: var(--bg-code);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  line-height: 1.55;
}
.snippet-copy {
  position: absolute;
  top: 6px;
  right: 6px;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--fg-muted);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  letter-spacing: 0.02em;
}
.snippet-copy:hover { color: var(--accent); border-color: var(--accent-edge); }
.snippet-copy:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.snippet-copy[data-copied="true"] {
  color: #16a34a;
  border-color: color-mix(in oklab, #16a34a, transparent 60%);
}

/* Collapsible details (schema preview) */
details {
  margin-top: var(--space-1);
  border: 0;
  border-radius: 0;
}
details > summary {
  cursor: pointer;
  padding: 4px 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--fg-muted);
  list-style: none;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  transition: color var(--duration-fast);
}
details > summary::-webkit-details-marker { display: none; }
details > summary::before {
  content: "+";
  display: inline-block;
  width: 10px;
  text-align: center;
  color: var(--fg-muted);
  font-weight: 600;
  transition: transform var(--duration-fast), color var(--duration-fast);
}
details[open] > summary::before { content: "−"; color: var(--accent); }
details > summary:hover { color: var(--accent); }
details > pre {
  margin-top: var(--space-2);
  font-size: 0.7rem;
  line-height: 1.55;
}

/* Prompt args */
.args-list {
  list-style: none;
  padding: 0;
  margin: var(--space-1) 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--fg-muted);
  font-family: var(--font-mono);
}
.args-list li { line-height: 1.6; }
.args-list code {
  font-size: 1em;
  background: transparent;
  border: 0;
  padding: 0;
  color: var(--fg);
}
.args-required {
  color: var(--accent);
  font-size: 0.625rem;
  font-weight: 600;
  margin-left: 5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Extensions */
.ext-card { background: var(--bg-subtle); border-color: var(--border-subtle); }
.ext-key { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg); }
.ext-preview {
  margin: var(--space-2) 0 0;
  font-size: 0.7rem;
  line-height: 1.55;
}

/* Empty / degraded state */
.empty-state {
  padding: var(--space-10) var(--space-6);
  text-align: center;
  color: var(--fg-muted);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
  font-size: var(--text-sm);
  font-family: var(--font-mono);
}

/* -------------------- Footer -------------------- */

footer {
  margin-top: var(--space-20);
  padding: var(--space-6) 0;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--fg-subtle);
  letter-spacing: 0.01em;
}
footer a {
  color: var(--fg-muted);
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-out);
}
footer a:hover { color: var(--accent); text-decoration: none; }
.footer-sep { color: var(--fg-subtle); opacity: 0.5; user-select: none; }
.footer-spacer { flex: 1 0 var(--space-4); }
.footer-attrib { color: var(--fg-subtle); }
.footer-attrib a { color: var(--fg-muted); }

/* -------------------- Responsive -------------------- */

@media (max-width: 760px) {
  main { padding: var(--space-6) var(--space-4) var(--space-16); }
  .hero { padding: var(--space-8) 0 var(--space-6); gap: var(--space-5); }
  .hero-heading { font-size: clamp(1.875rem, 7vw + 0.5rem, 2.5rem); letter-spacing: -0.035em; }
  .hero-title-row { gap: var(--space-3); }
  .hero-logo { width: 40px; height: 40px; }
  .hero-tagline { font-size: var(--text-base); }
  .status-strip { gap: var(--space-2); font-size: 0.6875rem; }
  .connect-chrome-endpoint { display: none; }
  .card-grid { grid-template-columns: 1fr; }
  section { padding: var(--space-8) 0 0; }
  .section-heading h2 { font-size: var(--text-xl); }
  .section-count { font-size: var(--text-xl); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`;
  return unsafeRaw(`<style>${css}</style>`);
}

// ---------------------------------------------------------------------------
// Copy-to-clipboard — single inlined script, < 1KB
// ---------------------------------------------------------------------------

function renderCopyScript(): SafeHtml {
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

/**
 * shields.io-style bi-part badge: "Built on" label + framework name. Links to
 * the framework's npm page. Lives in the hero when `landing.attribution` is
 * enabled.
 */
function renderFrameworkBadge(framework: ServerManifest['framework']): SafeHtml {
  const npmUrl = `https://www.npmjs.com/package/${encodeURIComponent(framework.name)}`;
  return html`<a class="badge-shield" href="${npmUrl}" rel="noopener" aria-label="Built on ${framework.name} v${framework.version}"><span class="badge-shield-label">Built on</span><span class="badge-shield-value">${framework.name} v${framework.version}</span></a>`;
}

function renderPill(text: string, variant: string): SafeHtml {
  return html`<span class="pill pill-${variant}">${text}</span>`;
}

function renderSectionHeading(id: string, label: string, count: number): SafeHtml {
  return html`
    <div class="section-heading">
      <h2 id="${id}">${label}</h2>
      <span class="section-count" aria-label="${String(count)} ${label}">${String(count)}</span>
    </div>
  `;
}

function renderSnippet(id: string, text: string): SafeHtml {
  const targetId = `snippet-${id}`;
  return html`
    <div class="snippet">
      <pre id="${targetId}"><code>${text}</code></pre>
      <button type="button" class="snippet-copy" data-copy data-copy-target="#${targetId}" aria-label="Copy">Copy</button>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Status strip — replaces the old auth banner
// ---------------------------------------------------------------------------

/**
 * Single-line status strip under the hero. Communicates auth mode, capability
 * counts, and protocol version in one mono-spaced, dot-separated row.
 *
 * Accessibility:
 * - `role="status"` so changes are announced live
 * - `aria-label` carries the long-form auth phrase for screen readers
 *   ("Public access", "Requires OAuth", etc.) even when the visible label is
 *   compact ("public", "oauth")
 */
function renderStatusStrip(manifest: ServerManifest, degraded: boolean): SafeHtml {
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
    <div class="status-strip" role="status" aria-label="${authMeta.ariaLabel}">
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

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function renderHero(manifest: ServerManifest, baseUrl: string, degraded: boolean): SafeHtml {
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

/**
 * `@scope/pkg-name` → `pkg-name`. Fall through for bare names.
 * Used as the `mcpServers` key and the Claude CLI server alias.
 */
function deriveShortName(serverName: string): string {
  const slash = serverName.lastIndexOf('/');
  return slash >= 0 ? serverName.slice(slash + 1) : serverName;
}

/** Convert ordered env entries to the `{ KEY: value }` shape MCP clients expect. */
function envFromEntries(
  entries: ReadonlyArray<{ key: string; value: string }>,
): Record<string, string> {
  return Object.fromEntries(entries.map(({ key, value }) => [key, value]));
}

/** `claude mcp add --transport http <name> <url>` */
function buildClaudeHttpCmd(shortName: string, endpoint: string): string {
  return `claude mcp add --transport http ${shortName} ${endpoint}`;
}

function renderConnectSnippets(manifest: ServerManifest, baseUrl: string): SafeHtml {
  const endpoint = `${baseUrl.replace(/\/$/, '')}${manifest.transport.endpointPath}`;
  const npmPackage = manifest.landing.npmPackage?.name;
  // `@cyanheads/mcp-ts-core` → `mcp-ts-core`. Short aliases match the convention
  // used in real Claude Desktop / Cursor configs and make the `claude mcp add`
  // command more ergonomic.
  const shortName = deriveShortName(manifest.server.name);
  const envExample = manifest.landing.envExample;
  const stdioEnv = envExample.length > 0 ? envFromEntries(envExample) : undefined;

  // STDIO: prefer native `bunx <pkg>@latest` when the server is published;
  // fall back to `mcp-remote` as a stdio → HTTP bridge so the tab is always
  // useful even for unpublished servers. Env vars belong here — this is the
  // only transport where the client spawns the server process and can pass
  // them through.
  const stdioConfig = JSON.stringify(
    {
      mcpServers: {
        [shortName]: {
          command: 'bunx',
          args: npmPackage ? [`${npmPackage}@latest`] : ['mcp-remote', endpoint],
          ...(stdioEnv && { env: stdioEnv }),
        },
      },
    },
    null,
    2,
  );

  // HTTP: no `env` block. MCP clients only forward env vars to spawned stdio
  // child processes; for `type: 'http'` there's no process, so including env
  // is a silent no-op that misleads visitors of a hosted instance into
  // thinking they need to supply credentials the server already owns.
  const httpConfig = JSON.stringify(
    {
      mcpServers: {
        [shortName]: {
          type: 'http',
          url: endpoint,
        },
      },
    },
    null,
    2,
  );

  // `claude mcp add` — always target the HTTP endpoint. The landing page is
  // served over HTTP, so a visitor is already interacting with this
  // instance; a stdio/bunx command here would install a different (local)
  // copy and carry env placeholders that HTTP wouldn't forward anyway. The
  // STDIO tab still carries the JSON for anyone who wants to run locally.
  const claudeCmd = buildClaudeHttpCmd(shortName, endpoint);

  const curl = [
    `curl -X POST ${endpoint} \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "MCP-Protocol-Version: ${manifest.protocol.latestVersion}" \\`,
    `  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"${manifest.protocol.latestVersion}","capabilities":{},"clientInfo":{"name":"curl","version":"1.0.0"}}}'`,
  ].join('\n');

  // Chrome label — npm package when published, else the HTTP endpoint (trimmed).
  const chromeLabel = npmPackage ?? endpoint.replace(/^https?:\/\//, '');

  const panels: Array<{ id: string; label: string; content: string; copyAriaLabel: string }> = [
    { id: 'stdio', label: 'STDIO', content: stdioConfig, copyAriaLabel: 'Copy stdio config' },
    {
      id: 'http',
      label: 'Streamable HTTP',
      content: httpConfig,
      copyAriaLabel: 'Copy HTTP config',
    },
    {
      id: 'claude',
      label: 'Claude',
      content: claudeCmd,
      copyAriaLabel: 'Copy claude mcp add command',
    },
    { id: 'curl', label: 'curl', content: curl, copyAriaLabel: 'Copy curl command' },
  ];

  return html`
    <div class="connect" aria-label="Connection snippets">
      <div class="connect-chrome">
        <span class="connect-chrome-dots" aria-hidden="true">
          <span class="connect-chrome-dot"></span>
          <span class="connect-chrome-dot"></span>
          <span class="connect-chrome-dot"></span>
        </span>
        <span class="connect-chrome-endpoint" title="${endpoint}">${chromeLabel}</span>
      </div>
      ${panels.map((p, i) =>
        i === 0
          ? html`<input type="radio" class="connect-tab-input" name="connect" id="connect-tab-${p.id}" checked />`
          : html`<input type="radio" class="connect-tab-input" name="connect" id="connect-tab-${p.id}" />`,
      )}
      <div class="connect-tabs" role="tablist">
        ${panels.map(
          (p) =>
            html`<label for="connect-tab-${p.id}" class="connect-tab-label" role="tab">${p.label}</label>`,
        )}
      </div>
      <div class="connect-panels">
        ${panels.map((p) => renderConnectPanel(p.id, p.content, p.copyAriaLabel))}
      </div>
    </div>
  `;
}

/** Single panel inside the connect card — pre/code + copy button. */
function renderConnectPanel(id: string, content: string, copyAriaLabel: string): SafeHtml {
  const snippetId = `connect-snippet-${id}`;
  return html`
    <div class="connect-panel panel-${id}" role="tabpanel">
      <pre id="${snippetId}"><code>${content}</code></pre>
      <button type="button" class="connect-copy" data-copy data-copy-target="#${snippetId}" aria-label="${copyAriaLabel}">Copy</button>
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

  const invocation = html`
    <details>
      <summary>Invocation</summary>
      ${renderSnippet(`tool-${tool.name}`, buildInvocationSnippet(tool))}
    </details>
  `;

  const authBadges =
    tool.auth && tool.auth.length > 0
      ? html`<div class="card-meta"><span class="card-meta-label">scopes</span>${tool.auth.map((scope) => html` <span class="pill pill-auth">${scope}</span>`)}</div>`
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
      ${invocation}
      ${schemaPreview}
    </article>
  `;
}

function renderToolsSection(tools: ManifestTool[]): SafeHtml {
  if (tools.length === 0) return html``;
  const groups = groupToolsByPrefix(tools);
  // A single group — whether labeled or not — would render as redundant with
  // the section header. Skip the sub-heading; render a flat grid.
  const showHeadings = groups.length > 1;
  const body = groups.map((group) => {
    const heading =
      showHeadings && group.label ? html`<h4 class="group-heading">${group.label}</h4>` : html``;
    return html`${heading}<div class="card-grid">${group.tools.map(renderToolCard)}</div>`;
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
        <span><span class="card-meta-label">uri</span> <code>${resource.uriTemplate}</code></span>
        ${resource.mimeType ? html`<span><span class="card-meta-label">mime</span> <code>${resource.mimeType}</code></span>` : html``}
      </div>
    </article>
  `;
}

function renderResourcesSection(resources: ManifestResource[]): SafeHtml {
  if (resources.length === 0) return html``;
  return html`
    <section aria-labelledby="section-resources">
      ${renderSectionHeading('section-resources', 'Resources', resources.length)}
      <div class="card-grid">${resources.map(renderResourceCard)}</div>
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
      <div class="card-grid">${prompts.map(renderPromptCard)}</div>
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
      <div class="card-grid">
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
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function renderFooter(manifest: ServerManifest): SafeHtml {
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
  const themeColor = html`<meta name="theme-color" content="${landing.theme.accent}" />`;

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
    ${themeColor}
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
    const baseUrl = manifest.transport.publicUrl ?? new URL(c.req.url).origin;

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
