/**
 * @fileoverview Hono handler factory for `GET /` — serves the HTML landing
 * page. Cache and body shape depend on `manifest.landing.requireAuth` and
 * whether the caller presents an Authorization header.
 *
 * @module src/mcp-server/transports/http/landing-page/handler
 */

import type { Context } from 'hono';

import type { ServerManifest } from '@/core/serverManifest.js';
import { logger } from '@/utils/internal/logger.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

import { renderLandingPage } from './render.js';

/**
 * Content-Security-Policy for the landing page. The page is fully
 * self-contained: a single inlined `<style>` block, a single inlined
 * copy-to-clipboard `<script>`, and a JSON-LD structured data block. Logos
 * are the only element with a variable source and are always either a
 * data URI or an `https://` URL. Nothing else is fetched, framed, or
 * submitted — the policy reflects that reality.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  "script-src 'unsafe-inline'",
  "img-src 'self' data: https:",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
].join('; ');

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
 *
 * When `manifest.transport.publicUrl` is set, the base URL is deterministic,
 * so both page variants (full and degraded) are rendered once at factory
 * time and served from memory on each request — the render pipeline then
 * only runs when the origin must be derived per-request from
 * `new URL(c.req.url).origin`.
 */
export function createLandingPageHandler(manifest: ServerManifest) {
  const { publicUrl } = manifest.transport;
  const precomputed = publicUrl
    ? {
        full: renderLandingPage(manifest, publicUrl, false),
        degraded: renderLandingPage(manifest, publicUrl, true),
      }
    : null;

  return (c: Context): Response => {
    const context = requestContextService.createRequestContext({
      operation: 'landingPageHandler',
    });
    const baseUrl = publicUrl ?? new URL(c.req.url).origin;

    const requireAuth = manifest.landing.requireAuth;
    const authHeader = c.req.header('authorization');
    const isAuthenticated = Boolean(authHeader && authHeader.trim().length > 0);
    const degraded = requireAuth && !isAuthenticated;

    const html = precomputed
      ? degraded
        ? precomputed.degraded
        : precomputed.full
      : renderLandingPage(manifest, baseUrl, degraded);

    logger.debug('Serving landing page.', {
      ...context,
      accept: c.req.header('accept'),
      bytes: html.length,
      requireAuth,
      degraded,
      cached: precomputed !== null,
    });

    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    if (requireAuth) {
      c.header('Cache-Control', 'private, max-age=60');
      c.header('Vary', 'Authorization');
    } else {
      c.header('Cache-Control', 'public, max-age=60');
    }
    return c.body(html);
  };
}
