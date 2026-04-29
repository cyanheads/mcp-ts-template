/**
 * @fileoverview End-to-end authz tests against a scoped-tool fixture server.
 * Uses the real SDK HTTP client with bearer tokens to verify that endpoint
 * authentication and per-tool authorization both behave correctly.
 * @module tests/integration/http-authz.e2e
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { generateTestJwt } from '../helpers/http-helpers.js';
import {
  assertServerBuilt,
  assertServerEntrypoint,
  type ServerHandle,
  startServerFromEntrypoint,
} from '../helpers/server-process.js';

const DIST_EXISTS = existsSync(resolve(process.cwd(), 'dist/index.js'));
const FIXTURE_ENTRYPOINT = 'tests/fixtures/auth-scoped-server.js';
const AUTH_SECRET = 'test-secret-key-for-conformance!';

function createToken(scopes: string[]): string {
  return generateTestJwt(
    {
      cid: 'authz-client',
      scp: scopes,
      sub: 'authz-user',
      tid: 'authz-tenant',
    },
    AUTH_SECRET,
  );
}

async function withClient<T>(
  port: number,
  token: string,
  run: (client: Client) => Promise<T>,
): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/mcp`), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
  const client = new Client({ name: 'authz-e2e', version: '1.0.0' });

  await client.connect(transport as unknown as Parameters<typeof client.connect>[0]);

  try {
    return await run(client);
  } finally {
    try {
      await client.close();
    } catch {
      // Transport may already be closed.
    }
  }
}

describe.skipIf(!DIST_EXISTS || !existsSync(resolve(process.cwd(), FIXTURE_ENTRYPOINT)))(
  'HTTP auth authorization e2e',
  () => {
    let handle: ServerHandle;

    beforeAll(async () => {
      assertServerBuilt();
      assertServerEntrypoint(FIXTURE_ENTRYPOINT);
      handle = await startServerFromEntrypoint(FIXTURE_ENTRYPOINT, 'http', {
        MCP_AUTH_MODE: 'jwt',
        MCP_AUTH_SECRET_KEY: AUTH_SECRET,
        MCP_SESSION_MODE: 'stateful',
      });
    });

    afterAll(async () => {
      await handle?.kill();
    });

    it('allows scoped callers to invoke both public and protected tools', async () => {
      const token = createToken(['tool:scoped_echo:read']);

      await withClient(handle.port!, token, async (client) => {
        const publicResult = await client.callTool({
          name: 'open_echo',
          arguments: { message: 'hello-public' },
        });
        const protectedResult = await client.callTool({
          name: 'scoped_echo',
          arguments: { message: 'hello-protected' },
        });

        expect(publicResult.isError).toBeUndefined();
        expect(publicResult.structuredContent).toEqual({
          echoed: 'hello-public',
          visibility: 'public',
        });

        expect(protectedResult.isError).toBeUndefined();
        expect(protectedResult.structuredContent).toEqual({
          echoed: 'hello-protected',
          visibility: 'protected',
        });
      });
    });

    it('returns an MCP authz error when the token lacks the protected tool scope', async () => {
      const token = createToken(['tool:other:read']);

      await withClient(handle.port!, token, async (client) => {
        const publicResult = await client.callTool({
          name: 'open_echo',
          arguments: { message: 'still-public' },
        });
        const protectedResult = await client.callTool({
          name: 'scoped_echo',
          arguments: { message: 'blocked' },
        });

        expect(publicResult.isError).toBeUndefined();
        expect(publicResult.structuredContent).toEqual({
          echoed: 'still-public',
          visibility: 'public',
        });

        expect(protectedResult.isError).toBe(true);
        expect(protectedResult.structuredContent).toEqual({
          error: {
            code: expect.any(Number),
            message: expect.stringContaining('Insufficient permissions.'),
          },
        });
        expect(protectedResult.content).toContainEqual({
          type: 'text',
          text: expect.stringContaining('Insufficient permissions.'),
        });
      });
    });
  },
);
