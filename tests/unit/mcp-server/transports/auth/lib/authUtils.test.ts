/**
 * @fileoverview Unit tests for authorization utilities.
 * @module tests/mcp-server/transports/auth/lib/authUtils.test
 */
import { describe, expect, it, vi } from 'vitest';

import { authContext } from '@/mcp-server/transports/auth/lib/authContext.js';
import type { AuthInfo } from '@/mcp-server/transports/auth/lib/authTypes.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

// Mutable config mock — tests override mcpAuthMode per scenario.
const mockConfig = { mcpAuthMode: 'none' as string };
vi.mock('@/config/index.js', () => ({ config: mockConfig }));

// Must import after vi.mock so the mock is in place.
const { withRequiredScopes } = await import('@/mcp-server/transports/auth/lib/authUtils.js');

describe('withRequiredScopes', () => {
  const createAuthInfo = (scopes: string[]): AuthInfo => ({
    token: 'test-token',
    clientId: 'test-client',
    scopes,
    subject: 'user-123',
  });

  describe('when auth is disabled (MCP_AUTH_MODE=none)', () => {
    it('allows execution when no auth context is present', () => {
      mockConfig.mcpAuthMode = 'none';
      expect(() => withRequiredScopes(['scope:read'])).not.toThrow();
    });
  });

  describe('when auth is enabled (MCP_AUTH_MODE=jwt)', () => {
    it('throws Unauthorized when no auth context is present', () => {
      mockConfig.mcpAuthMode = 'jwt';
      try {
        withRequiredScopes(['scope:read']);
        throw new Error('Expected withRequiredScopes to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(JsonRpcErrorCode.Unauthorized);
        expect(mcpError.message).toContain('Authentication required');
      }
    });

    it('passes when the auth context satisfies all required scopes', () => {
      mockConfig.mcpAuthMode = 'jwt';
      authContext.run({ authInfo: createAuthInfo(['scope:read', 'scope:write']) }, () => {
        expect(() => withRequiredScopes(['scope:read'])).not.toThrow();
        expect(() => withRequiredScopes(['scope:read', 'scope:write'])).not.toThrow();
      });
    });

    it('passes when a parent request context is provided', () => {
      mockConfig.mcpAuthMode = 'jwt';
      const parentContext = {
        operation: 'parentScopeCheck',
        requestId: 'req-parent',
        timestamp: '2026-03-30T00:00:00.000Z',
      } as never;

      authContext.run({ authInfo: createAuthInfo(['scope:read', 'scope:write']) }, () => {
        expect(() => withRequiredScopes(['scope:read'], parentContext)).not.toThrow();
      });
    });

    it('throws Forbidden when a required scope is missing', () => {
      mockConfig.mcpAuthMode = 'jwt';
      authContext.run({ authInfo: createAuthInfo(['scope:read']) }, () => {
        try {
          withRequiredScopes(['scope:read', 'scope:write']);
          throw new Error('Expected withRequiredScopes to throw');
        } catch (error) {
          expect(error).toBeInstanceOf(McpError);
          const mcpError = error as McpError;
          expect(mcpError.code).toBe(JsonRpcErrorCode.Forbidden);
          expect(mcpError.message).toBe('Insufficient permissions.');
          // No auth details should leak to client-facing errors (prevents scope enumeration)
          expect(mcpError.data).toBeUndefined();
        }
      });
    });
  });
});
