/**
 * @fileoverview Test harness that wires a real McpServer to an SDK Client
 * over InMemoryTransport. No mocks — exercises the full protocol stack.
 * Optionally wraps the client transport with RecordingTransport for
 * wire-level message capture.
 * @module tests/conformance/helpers/server-harness
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientCapabilities } from '@modelcontextprotocol/sdk/types.js';

import { createApp } from '@/app.js';
import { RecordingTransport } from './recording-transport.js';

export interface ConformanceHarness {
  cleanup: () => Promise<void>;
  client: Client;
  /** Available when recording is enabled */
  recorder?: RecordingTransport | undefined;
  server: McpServer;
}

/**
 * Creates a real McpServer with all tools/resources/prompts registered,
 * connects it to an SDK Client via InMemoryTransport, and returns both
 * plus a cleanup function.
 *
 * Call `cleanup()` in afterAll/afterEach to tear down transports.
 */
export async function createConformanceHarness(
  clientCapabilities?: ClientCapabilities,
  options?: { recording?: boolean },
): Promise<ConformanceHarness> {
  // Direct construction — no DI container
  const { createServer } = await createApp();

  // Real server — all tools/resources/prompts registered
  const server = await createServer();

  // Paired in-process transports — no network
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  let recorder: RecordingTransport | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let effectiveClientTransport: any = clientTransport;

  if (options?.recording) {
    recorder = new RecordingTransport(clientTransport, 'client-to-server');
    effectiveClientTransport = recorder;
  }

  // Client with optional capabilities (elicitation, sampling, roots)
  const client = new Client(
    { name: 'conformance-test-client', version: '1.0.0' },
    clientCapabilities ? { capabilities: clientCapabilities } : {},
  );

  // Connect both sides — triggers the initialize handshake
  await server.connect(serverTransport);
  await client.connect(effectiveClientTransport);

  return {
    client,
    server,
    recorder,
    cleanup: async () => {
      await client.close();
      await server.close();
    },
  };
}
