/**
 * @fileoverview Unit tests for JWT authentication strategy.
 * @module tests/mcp-server/transports/auth/strategies/jwtStrategy
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SignJWT } from 'jose';

import { JwtStrategy } from '@/mcp-server/transports/auth/strategies/jwtStrategy.js';
import { config } from '@/config/index.js';
import { logger } from '@/utils/index.js';
import { McpError } from '@/types-global/errors.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let originalEnv: string;
  let originalSecretKey: string | undefined;
  let originalClientId: string | undefined;
  let originalScopes: string[] | undefined;
  const testSecret = 'test-secret-key-min-32-chars-long-for-hs256';
  const testSecretBytes = new TextEncoder().encode(testSecret);

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = config.environment;
    originalSecretKey = config.mcpAuthSecretKey;
    originalClientId = config.devMcpClientId;
    originalScopes = config.devMcpScopes;
  });

  afterEach(() => {
    // Restore original config
    Object.defineProperty(config, 'environment', {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'mcpAuthSecretKey', {
      value: originalSecretKey,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'devMcpClientId', {
      value: originalClientId,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'devMcpScopes', {
      value: originalScopes,
      writable: true,
      configurable: true,
    });
  });

  describe('constructor', () => {
    it('should initialize successfully with valid secret key', () => {
      Object.defineProperty(config, 'mcpAuthSecretKey', {
        value: testSecret,
        writable: true,
        configurable: true,
      });

      strategy = new JwtStrategy(config, logger);

      expect(strategy).toBeInstanceOf(JwtStrategy);
    });

    it('should throw error in production without secret key', () => {
      Object.defineProperty(config, 'environment', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'mcpAuthSecretKey', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(() => new JwtStrategy(config, logger)).toThrow(McpError);
    });

    it('should allow missing secret key in development', () => {
      Object.defineProperty(config, 'environment', {
        value: 'development',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'mcpAuthSecretKey', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      strategy = new JwtStrategy(config, logger);

      expect(strategy).toBeInstanceOf(JwtStrategy);
    });
  });

  describe('verify', () => {
    beforeEach(() => {
      Object.defineProperty(config, 'mcpAuthSecretKey', {
        value: testSecret,
        writable: true,
        configurable: true,
      });
      strategy = new JwtStrategy(config, logger);
    });

    it('should verify valid JWT token with cid claim', async () => {
      const token = await new SignJWT({
        cid: 'test-client',
        scp: ['tool:read', 'resource:write'],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(testSecretBytes);

      const authInfo = await strategy.verify(token);

      expect(authInfo.clientId).toBe('test-client');
      expect(authInfo.scopes).toEqual(['tool:read', 'resource:write']);
      expect(authInfo.token).toBe(token);
    });

    it('should verify valid JWT token with client_id claim', async () => {
      const token = await new SignJWT({
        client_id: 'test-client-id',
        scope: 'tool:read resource:write',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(testSecretBytes);

      const authInfo = await strategy.verify(token);

      expect(authInfo.clientId).toBe('test-client-id');
      expect(authInfo.scopes).toEqual(['tool:read', 'resource:write']);
    });

    it('should extract tenant ID from tid claim', async () => {
      const token = await new SignJWT({
        cid: 'test-client',
        scp: ['tool:read'],
        tid: 'tenant-123',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(testSecretBytes);

      const authInfo = await strategy.verify(token);

      expect(authInfo.tenantId).toBe('tenant-123');
    });

    it('should extract subject from sub claim', async () => {
      const token = await new SignJWT({
        cid: 'test-client',
        scp: ['tool:read'],
        sub: 'user-456',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(testSecretBytes);

      const authInfo = await strategy.verify(token);

      expect(authInfo.subject).toBe('user-456');
    });

    it('should throw error for missing client ID claim', async () => {
      const token = await new SignJWT({
        scp: ['tool:read'],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(testSecretBytes);

      await expect(strategy.verify(token)).rejects.toThrow(McpError);
      await expect(strategy.verify(token)).rejects.toThrow(
        /missing 'cid' or 'client_id'/,
      );
    });

    it('should throw error for missing scopes claim', async () => {
      const token = await new SignJWT({
        cid: 'test-client',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(testSecretBytes);

      await expect(strategy.verify(token)).rejects.toThrow(McpError);
      await expect(strategy.verify(token)).rejects.toThrow(/non-empty scopes/);
    });

    it('should throw error for expired token', async () => {
      const token = await new SignJWT({
        cid: 'test-client',
        scp: ['tool:read'],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('0s') // Already expired
        .sign(testSecretBytes);

      // Wait a bit to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      await expect(strategy.verify(token)).rejects.toThrow(McpError);
    });

    it('should throw error for invalid signature', async () => {
      const wrongSecret = new TextEncoder().encode('wrong-secret-key');
      const token = await new SignJWT({
        cid: 'test-client',
        scp: ['tool:read'],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(wrongSecret);

      await expect(strategy.verify(token)).rejects.toThrow(McpError);
    });

    it('should bypass verification in development mode without secret', async () => {
      Object.defineProperty(config, 'environment', {
        value: 'development',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'mcpAuthSecretKey', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'devMcpClientId', {
        value: 'dev-client',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(config, 'devMcpScopes', {
        value: ['dev:read', 'dev:write'],
        writable: true,
        configurable: true,
      });

      const devStrategy = new JwtStrategy(config, logger);

      const authInfo = await devStrategy.verify('any-token');

      expect(authInfo.clientId).toBe('dev-client');
      expect(authInfo.scopes).toEqual(['dev:read', 'dev:write']);
      expect(authInfo.token).toBe('dev-mode-placeholder-token');
    });

    it('should handle space-separated scope string', async () => {
      const token = await new SignJWT({
        cid: 'test-client',
        scope: '  tool:read   resource:write  tool:execute  ',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(testSecretBytes);

      const authInfo = await strategy.verify(token);

      expect(authInfo.scopes).toEqual([
        'tool:read',
        'resource:write',
        'tool:execute',
      ]);
    });

    it('should throw error for empty scope array', async () => {
      const token = await new SignJWT({
        cid: 'test-client',
        scp: [],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(testSecretBytes);

      await expect(strategy.verify(token)).rejects.toThrow(McpError);
      await expect(strategy.verify(token)).rejects.toThrow(/non-empty scopes/);
    });

    it('should throw error for whitespace-only scope string', async () => {
      const token = await new SignJWT({
        cid: 'test-client',
        scope: '   ',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(testSecretBytes);

      await expect(strategy.verify(token)).rejects.toThrow(McpError);
      await expect(strategy.verify(token)).rejects.toThrow(/non-empty scopes/);
    });
  });
});
