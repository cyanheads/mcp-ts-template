/**
 * @fileoverview Integration tests for HTTP authentication. Starts the server
 * with JWT auth enabled and validates token enforcement, expiry rejection,
 * and unprotected endpoint accessibility.
 * @module tests/integration/http-auth
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { generateTestJwt, initializeBody, MCP_HEADERS } from '../helpers/http-helpers.js';
import { assertServerBuilt, type ServerHandle, startServer } from '../helpers/server-process.js';

const SERVER_EXISTS = existsSync(resolve(process.cwd(), 'dist/index.js'));
const AUTH_SECRET = 'test-secret-key-for-conformance!';

describe.skipIf(!SERVER_EXISTS)('HTTP auth integration', () => {
  let handle: ServerHandle;

  beforeAll(async () => {
    assertServerBuilt();
    handle = await startServer('http', {
      MCP_AUTH_MODE: 'jwt',
      MCP_AUTH_SECRET_KEY: AUTH_SECRET,
    });
  });

  afterAll(async () => {
    await handle?.kill();
  });

  it('rejects unauthenticated POST /mcp with 401', async () => {
    const res = await fetch(`http://localhost:${handle.port}/mcp`, {
      body: initializeBody(),
      headers: { ...MCP_HEADERS },
      method: 'POST',
    });

    expect(res.status).toBe(401);
  });

  it('accepts a valid JWT and completes initialize', async () => {
    const token = generateTestJwt(
      {
        cid: 'test-client',
        scp: ['tool:echo:read'],
        sub: 'test-user',
        tid: 'test-tenant',
      },
      AUTH_SECRET,
    );

    const res = await fetch(`http://localhost:${handle.port}/mcp`, {
      body: initializeBody(),
      headers: {
        ...MCP_HEADERS,
        Authorization: `Bearer ${token}`,
      },
      method: 'POST',
    });

    expect(res.status).toBe(200);
  });

  it('rejects an expired JWT with 401', async () => {
    const token = generateTestJwt(
      {
        cid: 'test-client',
        scp: ['tool:echo:read'],
        sub: 'test-user',
        tid: 'test-tenant',
      },
      AUTH_SECRET,
      -1, // Already expired
    );

    const res = await fetch(`http://localhost:${handle.port}/mcp`, {
      body: initializeBody(),
      headers: {
        ...MCP_HEADERS,
        Authorization: `Bearer ${token}`,
      },
      method: 'POST',
    });

    expect(res.status).toBe(401);
  });

  it('allows GET /healthz without auth', async () => {
    const res = await fetch(`http://localhost:${handle.port}/healthz`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
  });

  it('allows GET /mcp without auth (info endpoint)', async () => {
    const res = await fetch(`http://localhost:${handle.port}/mcp`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status?: string | undefined };
    expect(body.status).toBe('ok');
  });
});
