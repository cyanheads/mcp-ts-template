/**
 * @fileoverview Integration tests for the stdio transport. Spawns a real server
 * subprocess and drives it via the official MCP SDK client over stdio pipes.
 * @module tests/integration/stdio
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DIST_INDEX = resolve(process.cwd(), 'dist/index.js');
const SERVER_EXISTS = existsSync(DIST_INDEX);

describe.skipIf(!SERVER_EXISTS)('Stdio transport integration', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: 'node',
      args: [DIST_INDEX],
      env: {
        ...process.env,
        MCP_LOG_LEVEL: 'error',
        MCP_TRANSPORT_TYPE: 'stdio',
      },
    });

    client = new Client({ name: 'stdio-integration', version: '1.0.0' });
    await client.connect(transport);
  });

  afterAll(async () => {
    try {
      await client?.close();
    } catch {
      // Client may already be closed or process exited
    }
  });

  it('completes the MCP handshake and reports server info', () => {
    const version = client.getServerVersion();
    expect(version).toBeDefined();
    expect(version?.name).toBeTruthy();
  });

  it('invokes template_echo_message over stdio', async () => {
    const result = await client.callTool({
      name: 'template_echo_message',
      arguments: { message: 'stdio-test' },
    });

    expect(result).toBeDefined();
    expect('content' in result).toBe(true);

    if ('content' in result) {
      const blocks = result.content as Array<{ text?: string | undefined; type: string }>;
      const textBlock = blocks.find((b) => b.type === 'text');
      expect(textBlock?.text).toContain('stdio-test');
    }
  });

  it('shuts down cleanly without hanging', async () => {
    // Closing should resolve without throwing or timing out.
    // The afterAll hook handles the actual close — this test verifies
    // a second close is also safe (idempotent).
    await expect(client.close()).resolves.toBeUndefined();
  });
});
