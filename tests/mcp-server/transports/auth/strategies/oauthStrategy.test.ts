/**
 * @fileoverview Test suite for OAuth authentication strategy
 * @module tests/mcp-server/transports/auth/strategies/oauthStrategy.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OauthStrategy } from '@/mcp-server/transports/auth/strategies/oauthStrategy.js';
import { config } from '@/config/index.js';
import { logger } from '@/utils/index.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

// Mock the jose module - use factory function to avoid hoisting issues
vi.mock('jose');

// Import mocked jose to get references to mocked functions
import * as jose from 'jose';

describe('OAuth Strategy', () => {
  let strategy: OauthStrategy;
  let originalAuthMode: string;
  let originalIssuerUrl: string | undefined;
  let originalAudience: string | undefined;
  let originalJwksUri: string | undefined;
  let originalResourceId: string | undefined;
  let originalJwksCooldown: number;
  let originalJwksTimeout: number;

  const mockJWKS = vi.fn();
  const mockCreateRemoteJWKSet = vi.mocked(jose.createRemoteJWKSet);
  const mockJwtVerify = vi.mocked(jose.jwtVerify);

  beforeEach(() => {
    vi.clearAllMocks();

    // Save original config
    originalAuthMode = config.mcpAuthMode;
    originalIssuerUrl = config.oauthIssuerUrl;
    originalAudience = config.oauthAudience;
    originalJwksUri = config.oauthJwksUri;
    originalResourceId = config.mcpServerResourceIdentifier;
    originalJwksCooldown = config.oauthJwksCooldownMs;
    originalJwksTimeout = config.oauthJwksTimeoutMs;

    // Mock createRemoteJWKSet to return mock JWKS function
    mockCreateRemoteJWKSet.mockReturnValue(mockJWKS as any);
  });

  afterEach(() => {
    // Restore original config
    Object.defineProperty(config, 'mcpAuthMode', {
      value: originalAuthMode,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'oauthIssuerUrl', {
      value: originalIssuerUrl,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'oauthAudience', {
      value: originalAudience,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'oauthJwksUri', {
      value: originalJwksUri,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'mcpServerResourceIdentifier', {
      value: originalResourceId,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'oauthJwksCooldownMs', {
      value: originalJwksCooldown,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'oauthJwksTimeoutMs', {
      value: originalJwksTimeout,
      writable: true,
      configurable: true,
    });
  });

  describe('constructor', () => {
    it('should initialize successfully with valid OAuth config', () => {
      Object.defineProperty(config, 'mcpAuthMode', {
        value: 'oauth',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthIssuerUrl', {
        value: 'https://example.auth0.com/',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthAudience', {
        value: 'https://api.example.com',
        writable: true,
        configurable: true,
      });

      strategy = new OauthStrategy(config, logger);

      expect(strategy).toBeInstanceOf(OauthStrategy);
      expect(mockCreateRemoteJWKSet).toHaveBeenCalled();
    });

    it('should throw error when auth mode is not oauth', () => {
      Object.defineProperty(config, 'mcpAuthMode', {
        value: 'jwt',
        writable: true,
        configurable: true,
      });

      expect(() => new OauthStrategy(config, logger)).toThrow(
        'OauthStrategy instantiated for non-oauth auth mode',
      );
    });

    it('should throw McpError when OAUTH_ISSUER_URL is missing', () => {
      Object.defineProperty(config, 'mcpAuthMode', {
        value: 'oauth',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthIssuerUrl', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthAudience', {
        value: 'https://api.example.com',
        writable: true,
        configurable: true,
      });

      expect(() => new OauthStrategy(config, logger)).toThrow(McpError);
      expect(() => new OauthStrategy(config, logger)).toThrow(
        /OAUTH_ISSUER_URL and OAUTH_AUDIENCE must be set/,
      );
    });

    it('should throw McpError when OAUTH_AUDIENCE is missing', () => {
      Object.defineProperty(config, 'mcpAuthMode', {
        value: 'oauth',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthIssuerUrl', {
        value: 'https://example.auth0.com/',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthAudience', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(() => new OauthStrategy(config, logger)).toThrow(McpError);
      expect(() => new OauthStrategy(config, logger)).toThrow(
        /OAUTH_ISSUER_URL and OAUTH_AUDIENCE must be set/,
      );
    });

    it('should initialize JWKS client with custom JWKS URI', () => {
      Object.defineProperty(config, 'mcpAuthMode', {
        value: 'oauth',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthIssuerUrl', {
        value: 'https://example.auth0.com/',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthAudience', {
        value: 'https://api.example.com',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthJwksUri', {
        value: 'https://custom.example.com/jwks',
        writable: true,
        configurable: true,
      });

      strategy = new OauthStrategy(config, logger);

      expect(mockCreateRemoteJWKSet).toHaveBeenCalledWith(
        new URL('https://custom.example.com/jwks'),
        expect.any(Object),
      );
    });

    it('should initialize JWKS client with default well-known path', () => {
      Object.defineProperty(config, 'mcpAuthMode', {
        value: 'oauth',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthIssuerUrl', {
        value: 'https://example.auth0.com/',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthAudience', {
        value: 'https://api.example.com',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthJwksUri', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      strategy = new OauthStrategy(config, logger);

      expect(mockCreateRemoteJWKSet).toHaveBeenCalledWith(
        new URL('https://example.auth0.com/.well-known/jwks.json'),
        expect.any(Object),
      );
    });

    it('should pass cooldown and timeout options to createRemoteJWKSet', () => {
      Object.defineProperty(config, 'mcpAuthMode', {
        value: 'oauth',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthIssuerUrl', {
        value: 'https://example.auth0.com/',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthAudience', {
        value: 'https://api.example.com',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthJwksCooldownMs', {
        value: 5000,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthJwksTimeoutMs', {
        value: 10000,
        writable: true,
        configurable: true,
      });

      strategy = new OauthStrategy(config, logger);

      expect(mockCreateRemoteJWKSet).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          cooldownDuration: 5000,
          timeoutDuration: 10000,
        }),
      );
    });
  });

  describe('verify', () => {
    beforeEach(() => {
      // Set up valid OAuth config for verify tests
      Object.defineProperty(config, 'mcpAuthMode', {
        value: 'oauth',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthIssuerUrl', {
        value: 'https://example.auth0.com/',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'oauthAudience', {
        value: 'https://api.example.com',
        writable: true,
        configurable: true,
      });

      strategy = new OauthStrategy(config, logger);
    });

    it('should verify valid OAuth token with all claims', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          client_id: 'test-client',
          scope: 'tool:read resource:write',
          sub: 'user-123',
          tid: 'tenant-456',
          iss: 'https://example.auth0.com/',
          aud: 'https://api.example.com',
        },
        protectedHeader: { alg: 'RS256', kid: 'key-1' },
        key: {} as any,
      } as any);

      const authInfo = await strategy.verify('test-token');

      expect(authInfo.clientId).toBe('test-client');
      expect(authInfo.scopes).toEqual(['tool:read', 'resource:write']);
      expect(authInfo.subject).toBe('user-123');
      expect(authInfo.tenantId).toBe('tenant-456');
      expect(authInfo.token).toBe('test-token');
    });

    it('should extract client_id from payload', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          client_id: 'oauth-client-id',
          scope: 'read write',
        },
        protectedHeader: { alg: 'RS256' },
        key: {} as any,
      } as any);

      const authInfo = await strategy.verify('token');

      expect(authInfo.clientId).toBe('oauth-client-id');
    });

    it('should extract scopes from space-separated string', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          client_id: 'test-client',
          scope: 'tool:read tool:write resource:list',
        },
        protectedHeader: { alg: 'RS256' },
        key: {} as any,
      } as any);

      const authInfo = await strategy.verify('token');

      expect(authInfo.scopes).toEqual([
        'tool:read',
        'tool:write',
        'resource:list',
      ]);
    });

    it('should handle optional subject and tenantId', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          client_id: 'test-client',
          scope: 'read',
        },
        protectedHeader: { alg: 'RS256' },
        key: {} as any,
      } as any);

      const authInfo = await strategy.verify('token');

      expect(authInfo.subject).toBeUndefined();
      expect(authInfo.tenantId).toBeUndefined();
    });

    it('should validate resource indicator when configured', async () => {
      Object.defineProperty(config, 'mcpServerResourceIdentifier', {
        value: 'https://mcp.example.com',
        writable: true,
        configurable: true,
      });

      mockJwtVerify.mockResolvedValue({
        payload: {
          client_id: 'test-client',
          scope: 'read',
          resource: 'https://mcp.example.com',
        },
        protectedHeader: { alg: 'RS256' },
        key: {} as any,
      } as any);

      const authInfo = await strategy.verify('token');

      expect(authInfo.clientId).toBe('test-client');
    });

    it('should allow token when resource matches in array', async () => {
      Object.defineProperty(config, 'mcpServerResourceIdentifier', {
        value: 'https://mcp.example.com',
        writable: true,
        configurable: true,
      });

      mockJwtVerify.mockResolvedValue({
        payload: {
          client_id: 'test-client',
          scope: 'read',
          resource: ['https://other.example.com', 'https://mcp.example.com'],
        },
        protectedHeader: { alg: 'RS256' },
        key: {} as any,
      } as any);

      const authInfo = await strategy.verify('token');

      expect(authInfo.clientId).toBe('test-client');
    });

    it('should reject token with resource mismatch', async () => {
      Object.defineProperty(config, 'mcpServerResourceIdentifier', {
        value: 'https://mcp.example.com',
        writable: true,
        configurable: true,
      });

      mockJwtVerify.mockResolvedValue({
        payload: {
          client_id: 'test-client',
          scope: 'read',
          resource: 'https://wrong.example.com',
        },
        protectedHeader: { alg: 'RS256' },
        key: {} as any,
      } as any);

      await expect(strategy.verify('token')).rejects.toThrow(McpError);
      await expect(strategy.verify('token')).rejects.toThrow(
        /Resource indicator mismatch/,
      );

      try {
        await strategy.verify('token');
      } catch (error) {
        expect((error as McpError).code).toBe(JsonRpcErrorCode.Forbidden);
      }
    });

    it('should skip resource validation when not configured', async () => {
      Object.defineProperty(config, 'mcpServerResourceIdentifier', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      mockJwtVerify.mockResolvedValue({
        payload: {
          client_id: 'test-client',
          scope: 'read',
          resource: 'https://any.example.com',
        },
        protectedHeader: { alg: 'RS256' },
        key: {} as any,
      } as any);

      const authInfo = await strategy.verify('token');

      expect(authInfo.clientId).toBe('test-client');
    });

    it('should throw Unauthorized for missing client_id claim', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          scope: 'read write',
        },
        protectedHeader: { alg: 'RS256' },
        key: {} as any,
      } as any);

      await expect(strategy.verify('token')).rejects.toThrow(McpError);
      await expect(strategy.verify('token')).rejects.toThrow(
        /must contain a 'client_id' claim/,
      );
    });

    it('should throw Unauthorized for missing scope claim', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          client_id: 'test-client',
        },
        protectedHeader: { alg: 'RS256' },
        key: {} as any,
      } as any);

      await expect(strategy.verify('token')).rejects.toThrow(McpError);
      await expect(strategy.verify('token')).rejects.toThrow(
        /must contain valid, non-empty scopes/,
      );
    });

    it('should accept empty scope string (results in single empty string scope)', async () => {
      // Note: ''.split(' ') returns [''] not [], so length check passes
      // This is existing behavior - empty string creates array with one empty string
      mockJwtVerify.mockResolvedValue({
        payload: {
          client_id: 'test-client',
          scope: '',
        },
        protectedHeader: { alg: 'RS256' },
        key: {} as any,
      } as any);

      const authInfo = await strategy.verify('token');

      // Current implementation allows this - scope '' becomes ['']
      expect(authInfo.scopes).toEqual(['']);
    });

    it('should throw Unauthorized for expired token', async () => {
      const expiredError = new Error('Token expired');
      expiredError.name = 'JWTExpired';
      mockJwtVerify.mockRejectedValue(expiredError);

      await expect(strategy.verify('token')).rejects.toThrow(McpError);
      await expect(strategy.verify('token')).rejects.toThrow(
        /Token has expired/,
      );
    });

    it('should throw Unauthorized for invalid signature', async () => {
      const signatureError = new Error('signature verification failed');
      signatureError.name = 'JWSSignatureVerificationFailed';
      mockJwtVerify.mockRejectedValue(signatureError);

      await expect(strategy.verify('token')).rejects.toThrow(McpError);
    });

    it('should re-throw existing McpError instances', async () => {
      const customMcpError = new McpError(
        JsonRpcErrorCode.Forbidden,
        'Custom error',
      );
      mockJwtVerify.mockRejectedValue(customMcpError);

      await expect(strategy.verify('token')).rejects.toThrow(customMcpError);
    });

    it('should call jwtVerify with correct parameters', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          client_id: 'test-client',
          scope: 'read',
        },
        protectedHeader: { alg: 'RS256' },
        key: {} as any,
      } as any);

      await strategy.verify('test-token');

      expect(mockJwtVerify).toHaveBeenCalledWith(
        'test-token',
        mockJWKS,
        expect.objectContaining({
          issuer: 'https://example.auth0.com/',
          audience: 'https://api.example.com',
        }),
      );
    });
  });
});
