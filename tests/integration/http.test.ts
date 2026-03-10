/**
 * @fileoverview Integration tests for the HTTP Streamable transport. Starts
 * the server as a subprocess, then validates both SDK client connectivity
 * and raw HTTP endpoint behavior.
 * @module tests/integration/http
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { assertServerBuilt, type ServerHandle, startServer } from './helpers/server-process.js';

const SERVER_EXISTS = existsSync(resolve(process.cwd(), 'dist/index.js'));

describe.skipIf(!SERVER_EXISTS)('HTTP transport integration', () => {
  let handle: ServerHandle;

  beforeAll(async () => {
    assertServerBuilt();
    handle = await startServer('http', { MCP_ALLOWED_ORIGINS: '' });
  });

  afterAll(async () => {
    await handle?.kill();
  });

  describe('SDK Client', () => {
    let client: Client;
    let transport: StreamableHTTPClientTransport;

    beforeAll(async () => {
      transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${handle.port}/mcp`));
      client = new Client({ name: 'http-integration', version: '1.0.0' });
      // SDK type mismatch with exactOptionalPropertyTypes — sessionId?: string vs string | undefined
      await client.connect(transport as unknown as Parameters<typeof client.connect>[0]);
    });

    afterAll(async () => {
      try {
        await client?.close();
      } catch {
        // Client may already be closed
      }
    });

    it('completes the MCP handshake over HTTP', () => {
      const version = client.getServerVersion();
      expect(version).toBeDefined();
      expect(version?.name).toBeTruthy();
    });

    it('invokes template_echo_message over HTTP', async () => {
      const result = await client.callTool({
        name: 'template_echo_message',
        arguments: { message: 'http-test' },
      });

      expect(result).toBeDefined();
      expect('content' in result).toBe(true);

      if ('content' in result) {
        const blocks = result.content as Array<{ text?: string | undefined; type: string }>;
        const textBlock = blocks.find((b) => b.type === 'text');
        expect(textBlock?.text).toContain('http-test');
      }
    });
  });

  describe('Raw HTTP endpoints', () => {
    it('GET /healthz returns 200 with status ok', async () => {
      const res = await fetch(`http://localhost:${handle.port}/healthz`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as { status: string };
      expect(body.status).toBe('ok');
    });

    it('GET /mcp returns server info', async () => {
      const res = await fetch(`http://localhost:${handle.port}/mcp`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        server?: { name?: string | undefined; version?: string | undefined } | undefined;
        status?: string | undefined;
      };
      expect(body.status).toBe('ok');
      expect(body.server?.name).toBeTruthy();
      expect(body.server?.version).toBeTruthy();
    });

    it('OPTIONS /mcp returns CORS headers', async () => {
      const res = await fetch(`http://localhost:${handle.port}/mcp`, {
        headers: {
          'Access-Control-Request-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
          'Access-Control-Request-Method': 'POST',
          Origin: 'http://example.com',
        },
        method: 'OPTIONS',
      });

      // Hono CORS middleware returns 204 for preflight
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBeTruthy();
      expect(res.headers.get('access-control-allow-methods')).toContain('POST');

      const exposedHeaders = res.headers.get('access-control-expose-headers') ?? '';
      expect(exposedHeaders.toLowerCase()).toContain('mcp-session-id');
    });
  });
});
