/**
 * @fileoverview Unit tests for the shared JWT claim parser.
 * @module tests/mcp-server/transports/auth/lib/claimParser.test
 */
import type { JWTPayload } from 'jose';
import { describe, expect, it } from 'vitest';

import {
  buildAuthInfoFromClaims,
  handleJoseVerifyError,
} from '@/mcp-server/transports/auth/lib/claimParser.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

const RAW_TOKEN = 'raw.jwt.token';

describe('buildAuthInfoFromClaims', () => {
  describe('clientId extraction', () => {
    it('extracts clientId from the cid claim (Okta)', () => {
      const payload: JWTPayload = { cid: 'okta-client', scp: ['read'] };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.clientId).toBe('okta-client');
    });

    it('extracts clientId from the client_id claim (OAuth standard)', () => {
      const payload: JWTPayload = { client_id: 'oauth-client', scp: ['read'] };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.clientId).toBe('oauth-client');
    });

    it('prefers cid over client_id when both are present', () => {
      const payload: JWTPayload = { cid: 'okta-client', client_id: 'oauth-client', scp: ['read'] };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.clientId).toBe('okta-client');
    });

    it('throws McpError (Unauthorized) when neither cid nor client_id is present', () => {
      const payload: JWTPayload = { scp: ['read'] };
      expect(() => buildAuthInfoFromClaims(RAW_TOKEN, payload)).toThrow(McpError);
      try {
        buildAuthInfoFromClaims(RAW_TOKEN, payload);
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(JsonRpcErrorCode.Unauthorized);
        expect(mcpError.message).toContain('cid');
        expect(mcpError.message).toContain('client_id');
      }
    });
  });

  describe('scope extraction', () => {
    it('extracts scopes from the scp array claim (Okta)', () => {
      const payload: JWTPayload = { cid: 'client', scp: ['read', 'write'] };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.scopes).toEqual(['read', 'write']);
    });

    it('extracts scopes from the scope space-delimited string claim (OAuth standard)', () => {
      const payload: JWTPayload = { cid: 'client', scope: 'read write' };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.scopes).toEqual(['read', 'write']);
    });

    it('prefers scp array over scope string when both are present', () => {
      const payload: JWTPayload = { cid: 'client', scp: ['scp-scope'], scope: 'scope-string' };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.scopes).toEqual(['scp-scope']);
    });

    it('throws McpError (Unauthorized) when neither scp nor scope is present', () => {
      const payload: JWTPayload = { cid: 'client' };
      expect(() => buildAuthInfoFromClaims(RAW_TOKEN, payload)).toThrow(McpError);
      try {
        buildAuthInfoFromClaims(RAW_TOKEN, payload);
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(JsonRpcErrorCode.Unauthorized);
      }
    });

    it('throws McpError (Unauthorized) when scp is an empty array', () => {
      const payload: JWTPayload = { cid: 'client', scp: [] };
      expect(() => buildAuthInfoFromClaims(RAW_TOKEN, payload)).toThrow(McpError);
      try {
        buildAuthInfoFromClaims(RAW_TOKEN, payload);
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(JsonRpcErrorCode.Unauthorized);
      }
    });

    it('throws McpError (Unauthorized) when scope is an empty string', () => {
      const payload: JWTPayload = { cid: 'client', scope: '' };
      expect(() => buildAuthInfoFromClaims(RAW_TOKEN, payload)).toThrow(McpError);
      try {
        buildAuthInfoFromClaims(RAW_TOKEN, payload);
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(JsonRpcErrorCode.Unauthorized);
      }
    });

    it('throws McpError (Unauthorized) when scope is a whitespace-only string', () => {
      const payload: JWTPayload = { cid: 'client', scope: '   ' };
      expect(() => buildAuthInfoFromClaims(RAW_TOKEN, payload)).toThrow(McpError);
      try {
        buildAuthInfoFromClaims(RAW_TOKEN, payload);
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(JsonRpcErrorCode.Unauthorized);
      }
    });
  });

  describe('optional claim extraction', () => {
    it('includes subject when sub claim is present', () => {
      const payload: JWTPayload = { cid: 'client', scp: ['read'], sub: 'user-123' };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.subject).toBe('user-123');
    });

    it('omits subject when sub claim is absent', () => {
      const payload: JWTPayload = { cid: 'client', scp: ['read'] };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.subject).toBeUndefined();
    });

    it('includes tenantId when tid claim is present', () => {
      const payload: JWTPayload = { cid: 'client', scp: ['read'], tid: 'tenant-abc' };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.tenantId).toBe('tenant-abc');
    });

    it('omits tenantId when tid claim is absent', () => {
      const payload: JWTPayload = { cid: 'client', scp: ['read'] };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.tenantId).toBeUndefined();
    });

    it('includes expiresAt when exp claim is present', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const payload: JWTPayload = { cid: 'client', scp: ['read'], exp };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.expiresAt).toBe(exp);
    });

    it('omits expiresAt when exp claim is absent', () => {
      const payload: JWTPayload = { cid: 'client', scp: ['read'] };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.expiresAt).toBeUndefined();
    });

    it('extracts all optional claims together', () => {
      const exp = Math.floor(Date.now() / 1000) + 7200;
      const payload: JWTPayload = {
        cid: 'client',
        scp: ['read', 'write'],
        sub: 'user-456',
        tid: 'tenant-xyz',
        exp,
      };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.subject).toBe('user-456');
      expect(result.tenantId).toBe('tenant-xyz');
      expect(result.expiresAt).toBe(exp);
    });
  });

  describe('token passthrough', () => {
    it('includes the raw token string in the returned AuthInfo', () => {
      const payload: JWTPayload = { cid: 'client', scp: ['read'] };
      const result = buildAuthInfoFromClaims(RAW_TOKEN, payload);
      expect(result.token).toBe(RAW_TOKEN);
    });

    it('preserves the exact token string without modification', () => {
      const complexToken = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature';
      const payload: JWTPayload = { cid: 'client', scp: ['read'] };
      const result = buildAuthInfoFromClaims(complexToken, payload);
      expect(result.token).toBe(complexToken);
    });
  });
});

describe('handleJoseVerifyError', () => {
  it('rethrows McpError instances unchanged', () => {
    const original = new McpError(JsonRpcErrorCode.Forbidden, 'custom forbidden');
    expect(() => handleJoseVerifyError(original, 'fallback')).toThrow(original);
  });

  it('maps JWTExpired errors to "Token has expired."', () => {
    const expired = new Error('jwt expired');
    expired.name = 'JWTExpired';
    try {
      handleJoseVerifyError(expired, 'fallback message');
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError).toBeInstanceOf(McpError);
      expect(mcpError.code).toBe(JsonRpcErrorCode.Unauthorized);
      expect(mcpError.message).toBe('Token has expired.');
    }
  });

  it('uses fallback message for non-expired jose errors', () => {
    const sigError = new Error('signature verification failed');
    sigError.name = 'JWSSignatureVerificationFailed';
    try {
      handleJoseVerifyError(sigError, 'Verification failed.');
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError).toBeInstanceOf(McpError);
      expect(mcpError.code).toBe(JsonRpcErrorCode.Unauthorized);
      expect(mcpError.message).toBe('Verification failed.');
    }
  });

  it('uses fallback message for non-Error values', () => {
    try {
      handleJoseVerifyError('string error', 'Unknown failure.');
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError).toBeInstanceOf(McpError);
      expect(mcpError.code).toBe(JsonRpcErrorCode.Unauthorized);
      expect(mcpError.message).toBe('Unknown failure.');
    }
  });

  it('always throws (return type is never)', () => {
    expect(() => handleJoseVerifyError(new Error('any'), 'fallback')).toThrow();
  });
});
