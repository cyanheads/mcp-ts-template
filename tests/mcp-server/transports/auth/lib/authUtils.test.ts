/**
 * @fileoverview Unit tests for authorization utilities.
 * @module tests/mcp-server/transports/auth/lib/authUtils.test
 */
import { describe, expect, it } from 'vitest';

import { authContext } from '@/mcp-server/transports/auth/lib/authContext.js';
import { withRequiredScopes } from '@/mcp-server/transports/auth/lib/authUtils.js';
import type { AuthInfo } from '@/mcp-server/transports/auth/lib/authTypes.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

describe('withRequiredScopes', () => {
  const createAuthInfo = (scopes: string[]): AuthInfo => ({
    token: 'test-token',
    clientId: 'test-client',
    scopes,
    subject: 'user-123',
  });

  it('allows execution when no auth context is present', () => {
    expect(() => withRequiredScopes(['scope:read'])).not.toThrow();
  });

  it('passes when the auth context satisfies all required scopes', () => {
    authContext.run(
      { authInfo: createAuthInfo(['scope:read', 'scope:write']) },
      () => {
        expect(() => withRequiredScopes(['scope:read'])).not.toThrow();
        expect(() =>
          withRequiredScopes(['scope:read', 'scope:write']),
        ).not.toThrow();
      },
    );
  });

  it('throws a forbidden error when a required scope is missing', () => {
    authContext.run({ authInfo: createAuthInfo(['scope:read']) }, () => {
      try {
        withRequiredScopes(['scope:read', 'scope:write']);
        throw new Error('Expected withRequiredScopes to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(JsonRpcErrorCode.Forbidden);
        expect(mcpError.message).toContain('Missing required scopes');
        expect(mcpError.data).toMatchObject({ missingScopes: ['scope:write'] });
      }
    });
  });
});
