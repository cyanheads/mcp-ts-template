/**
 * @fileoverview Unit tests for authentication strategy factory.
 * @module tests/mcp-server/transports/auth/authFactory
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '@/config/index.js';
import { createAuthStrategy } from '@/mcp-server/transports/auth/authFactory.js';
import { JwtStrategy } from '@/mcp-server/transports/auth/strategies/jwtStrategy.js';
import { OauthStrategy } from '@/mcp-server/transports/auth/strategies/oauthStrategy.js';

describe('createAuthStrategy', () => {
  let originalAuthMode: string;
  let originalSecretKey: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalAuthMode = config.mcpAuthMode;
    originalSecretKey = config.mcpAuthSecretKey;
  });

  afterEach(() => {
    // Restore original config values
    Object.defineProperty(config, 'mcpAuthMode', {
      value: originalAuthMode,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'mcpAuthSecretKey', {
      value: originalSecretKey,
      writable: true,
      configurable: true,
    });
  });

  it('should return JwtStrategy when auth mode is "jwt"', () => {
    Object.defineProperty(config, 'mcpAuthMode', {
      value: 'jwt',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'mcpAuthSecretKey', {
      value: 'test-secret-key-that-is-at-least-32-chars-long',
      writable: true,
      configurable: true,
    });

    const strategy = createAuthStrategy();

    expect(strategy).toBeInstanceOf(JwtStrategy);
  });

  it('should return OauthStrategy when auth mode is "oauth"', () => {
    Object.defineProperty(config, 'mcpAuthMode', {
      value: 'oauth',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'oauthIssuerUrl', {
      value: 'https://example.com',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'oauthAudience', {
      value: 'test-audience',
      writable: true,
      configurable: true,
    });

    const strategy = createAuthStrategy();

    expect(strategy).toBeInstanceOf(OauthStrategy);
  });

  it('should return null when auth mode is "none"', () => {
    Object.defineProperty(config, 'mcpAuthMode', {
      value: 'none',
      writable: true,
      configurable: true,
    });

    const strategy = createAuthStrategy();

    expect(strategy).toBeNull();
  });

  it('should throw error for unknown auth mode', () => {
    Object.defineProperty(config, 'mcpAuthMode', {
      value: 'unknown-auth-mode',
      writable: true,
      configurable: true,
    });

    expect(() => createAuthStrategy()).toThrow('Unknown authentication mode: unknown-auth-mode');
  });

  it('should resolve strategies from DI container', () => {
    Object.defineProperty(config, 'mcpAuthMode', {
      value: 'jwt',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(config, 'mcpAuthSecretKey', {
      value: 'test-secret-key-that-is-at-least-32-chars-long',
      writable: true,
      configurable: true,
    });

    const strategy1 = createAuthStrategy();
    const strategy2 = createAuthStrategy();

    // Should create new instances each time
    expect(strategy1).toBeInstanceOf(JwtStrategy);
    expect(strategy2).toBeInstanceOf(JwtStrategy);
  });
});
