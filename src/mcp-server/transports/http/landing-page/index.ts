/**
 * @fileoverview Public barrel for the HTML landing page served at `GET /`.
 * Self-contained, zero-dependency renderer producing a branded,
 * a11y-conscious, `prefers-color-scheme`-aware page from the shared
 * `ServerManifest`.
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
 * @module src/mcp-server/transports/http/landing-page/index
 */

export { createLandingPageHandler } from './handler.js';
export { renderLandingPage } from './render.js';
