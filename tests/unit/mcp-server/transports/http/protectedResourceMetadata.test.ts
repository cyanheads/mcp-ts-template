/**
 * @fileoverview Unit tests for OAuth protected resource metadata responses.
 * @module tests/mcp-server/transports/http/protectedResourceMetadata.test
 */

import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

const mockConfig = {
  mcpAuthMode: 'oauth',
  mcpServerResourceIdentifier: undefined as string | undefined,
  oauthAudience: undefined as string | undefined,
  oauthIssuerUrl: 'https://issuer.example.com',
};

const debugSpy = vi.fn();
const createRequestContextSpy = vi.fn(() => ({
  operation: 'protectedResourceMetadataHandler',
  requestId: 'req-metadata',
  timestamp: new Date().toISOString(),
}));

vi.mock('@/config/index.js', () => ({
  config: mockConfig,
}));

vi.mock('@/utils/internal/logger.js', () => ({
  logger: {
    debug: debugSpy,
  },
}));

vi.mock('@/utils/internal/requestContext.js', () => ({
  requestContextService: {
    createRequestContext: createRequestContextSpy,
  },
}));

const { protectedResourceMetadataHandler } = await import(
  '@/mcp-server/transports/http/protectedResourceMetadata.js'
);

describe('protectedResourceMetadataHandler', () => {
  it('returns OAuth metadata with authorization server details and cache headers', async () => {
    const app = new Hono();
    app.get('/.well-known/oauth-protected-resource', protectedResourceMetadataHandler);

    const response = await app.request('http://localhost/.well-known/oauth-protected-resource');
    const data: Record<string, unknown> = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(data).toEqual({
      authorization_servers: ['https://issuer.example.com'],
      bearer_methods_supported: ['header'],
      resource: 'http://localhost/mcp',
      resource_signing_alg_values_supported: ['RS256', 'ES256', 'PS256'],
    });
    expect(createRequestContextSpy).toHaveBeenCalledWith({
      operation: 'protectedResourceMetadataHandler',
    });
    expect(debugSpy).toHaveBeenCalledWith(
      'Serving Protected Resource Metadata.',
      expect.objectContaining({
        authMode: 'oauth',
        operation: 'protectedResourceMetadataHandler',
        resource: 'http://localhost/mcp',
      }),
    );
  });

  it('prefers explicit resource identifiers and omits OAuth metadata outside oauth mode', async () => {
    mockConfig.mcpAuthMode = 'jwt';
    mockConfig.mcpServerResourceIdentifier = 'urn:cyanheads:mcp-ts-core';
    mockConfig.oauthAudience = 'https://audience.example.com';

    const app = new Hono();
    app.get('/.well-known/oauth-protected-resource', protectedResourceMetadataHandler);

    const response = await app.request('http://localhost/.well-known/oauth-protected-resource');
    const data: Record<string, unknown> = await response.json();

    expect(data).toEqual({
      bearer_methods_supported: ['header'],
      resource: 'urn:cyanheads:mcp-ts-core',
    });
  });

  it('falls back to oauthAudience when resource identifier is absent', async () => {
    mockConfig.mcpAuthMode = 'none';
    mockConfig.mcpServerResourceIdentifier = undefined;
    mockConfig.oauthAudience = 'https://audience.example.com';

    const app = new Hono();
    app.get('/.well-known/oauth-protected-resource', protectedResourceMetadataHandler);

    const response = await app.request('http://localhost/.well-known/oauth-protected-resource');
    const data: Record<string, unknown> = await response.json();

    expect(data).toEqual({
      bearer_methods_supported: ['header'],
      resource: 'https://audience.example.com',
    });
  });
});
