/**
 * @fileoverview Unit tests for authentication strategy factory.
 * @module tests/mcp-server/transports/auth/authFactory
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { container } from 'tsyringe';

import { createAuthStrategy } from '@/mcp-server/transports/auth/authFactory.js';
import { JwtStrategy } from '@/mcp-server/transports/auth/strategies/jwtStrategy.js';
import { OauthStrategy } from '@/mcp-server/transports/auth/strategies/oauthStrategy.js';
import { config } from '@/config/index.js';
import { logger } from '@/utils/index.js';
import { AppConfig, Logger } from '@/container/tokens.js';

describe('createAuthStrategy', () => {
  let originalAuthMode: string;

  beforeEach(() => {
    vi.clearAllMocks();
    container.clearInstances();

    // Register required dependencies in DI container
    container.register(AppConfig, { useValue: config });
    container.register(Logger, { useValue: logger });

    originalAuthMode = config.mcpAuthMode;
  });

  afterEach(() => {
    // Restore original auth mode
    Object.defineProperty(config, 'mcpAuthMode', {
      value: originalAuthMode,
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

    expect(() => createAuthStrategy()).toThrow(
      'Unknown authentication mode: unknown-auth-mode',
    );
  });

  it('should resolve strategies from DI container', () => {
    Object.defineProperty(config, 'mcpAuthMode', {
      value: 'jwt',
      writable: true,
      configurable: true,
    });

    const strategy1 = createAuthStrategy();
    const strategy2 = createAuthStrategy();

    // Should create new instances each time (default tsyringe behavior)
    expect(strategy1).toBeInstanceOf(JwtStrategy);
    expect(strategy2).toBeInstanceOf(JwtStrategy);
  });
});
