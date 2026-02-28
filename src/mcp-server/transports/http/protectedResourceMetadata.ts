/**
 * @fileoverview RFC 9728 OAuth Protected Resource Metadata endpoint handler.
 * Serves `/.well-known/oauth-protected-resource` to enable MCP clients to
 * discover the authorization server for this resource. Always returns 200
 * regardless of auth mode — oauth mode includes full authorization server
 * metadata; jwt/none modes return a minimal resource identifier only.
 * @see {@link https://datatracker.ietf.org/doc/html/rfc9728 | RFC 9728: OAuth 2.0 Protected Resource Metadata}
 * @module src/mcp-server/transports/http/protectedResourceMetadata
 */

import type { Context } from 'hono';

import { config } from '@/config/index.js';
import { logger } from '@/utils/internal/logger.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

/**
 * Hono route handler for the RFC 9728 Protected Resource Metadata endpoint.
 *
 * Always mounted and always returns 200. Behavior varies by auth mode:
 * - `oauth`: full metadata including `authorization_servers`, signing algorithms
 * - `jwt`/`none`: minimal metadata with just the resource identifier
 *
 * Response is cacheable for 1 hour per RFC 9728 recommendations.
 */
export function protectedResourceMetadataHandler(c: Context): Response {
  const context = requestContextService.createRequestContext({
    operation: 'protectedResourceMetadataHandler',
  });

  const origin = new URL(c.req.url).origin;
  const resource = config.mcpServerResourceIdentifier ?? config.oauthAudience ?? `${origin}/mcp`;

  const metadata: Record<string, unknown> = {
    resource,
    bearer_methods_supported: ['header'],
  };

  if (config.mcpAuthMode === 'oauth' && config.oauthIssuerUrl) {
    metadata.authorization_servers = [config.oauthIssuerUrl];
    metadata.resource_signing_alg_values_supported = ['RS256', 'ES256', 'PS256'];
  }

  logger.debug('Serving Protected Resource Metadata.', {
    ...context,
    resource,
    authMode: config.mcpAuthMode,
  });

  c.header('Cache-Control', 'public, max-age=3600');
  return c.json(metadata);
}
