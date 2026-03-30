/**
 * @fileoverview Focused mocked tests for JwtStrategy branches that are impractical
 * to reach with real jose verification primitives.
 * @module tests/mcp-server/transports/auth/strategies/jwtStrategy.mocked.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JsonRpcErrorCode } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    environment: 'production',
    mcpAuthSecretKey: 'test-secret-key-min-32-chars-long-for-hs256',
    devMcpAuthBypass: false,
    devMcpClientId: undefined as string | undefined,
    devMcpScopes: undefined as string[] | undefined,
    mcpJwtExpectedIssuer: undefined as string | undefined,
    mcpJwtExpectedAudience: undefined as string | undefined,
  } as Record<string, unknown>,
}));

vi.mock('@/config/index.js', () => ({
  config: mockConfig,
}));

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

import { jwtVerify } from 'jose';
import { JwtStrategy } from '@/mcp-server/transports/auth/strategies/jwtStrategy.js';

describe('JwtStrategy mocked branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.environment = 'production';
    mockConfig.mcpAuthSecretKey = 'test-secret-key-min-32-chars-long-for-hs256';
    mockConfig.devMcpAuthBypass = false;
    mockConfig.devMcpClientId = undefined;
    mockConfig.devMcpScopes = undefined;
    mockConfig.mcpJwtExpectedIssuer = undefined;
    mockConfig.mcpJwtExpectedAudience = undefined;
  });

  it('normalizes non-Error verification failures', async () => {
    vi.mocked(jwtVerify).mockRejectedValue('not-an-error');

    const strategy = new JwtStrategy(mockConfig as never, logger);

    await expect(strategy.verify('synthetic-token')).rejects.toMatchObject({
      code: JsonRpcErrorCode.Unauthorized,
      message: 'Token verification failed.',
    });
  });
});
