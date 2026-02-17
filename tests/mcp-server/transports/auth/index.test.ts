/**
 * @fileoverview Test suite for auth barrel export
 * @module tests/mcp-server/transports/auth/index.test
 */

import { describe, expect, it } from 'vitest';

describe('Auth Barrel Export', () => {
  it('should export authContext', async () => {
    const mod = await import('@/mcp-server/transports/auth/index.js');
    expect(mod.authContext).toBeDefined();
  });

  it('should export withRequiredScopes', async () => {
    const mod = await import('@/mcp-server/transports/auth/index.js');
    expect(mod.withRequiredScopes).toBeDefined();
    expect(typeof mod.withRequiredScopes).toBe('function');
  });

  it('should export createAuthStrategy', async () => {
    const mod = await import('@/mcp-server/transports/auth/index.js');
    expect(mod.createAuthStrategy).toBeDefined();
    expect(typeof mod.createAuthStrategy).toBe('function');
  });

  it('should export createAuthMiddleware', async () => {
    const mod = await import('@/mcp-server/transports/auth/index.js');
    expect(mod.createAuthMiddleware).toBeDefined();
    expect(typeof mod.createAuthMiddleware).toBe('function');
  });

  it('should export JwtStrategy class', async () => {
    const mod = await import('@/mcp-server/transports/auth/index.js');
    expect(mod.JwtStrategy).toBeDefined();
  });

  it('should export OauthStrategy class', async () => {
    const mod = await import('@/mcp-server/transports/auth/index.js');
    expect(mod.OauthStrategy).toBeDefined();
  });
});
