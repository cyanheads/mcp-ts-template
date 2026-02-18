/**
 * @fileoverview Test harness that wires a real McpServer to an SDK Client
 * over InMemoryTransport. No mocks — exercises the full protocol stack.
 * @module tests/conformance/helpers/server-harness
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientCapabilities } from '@modelcontextprotocol/sdk/types.js';

import { composeContainer } from '@/container/index.js';
import { createMcpServerInstance } from '@/mcp-server/server.js';

export interface ConformanceHarness {
  client: Client;
  server: McpServer;
  cleanup: () => Promise<void>;
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
): Promise<ConformanceHarness> {
  // Ensure DI is bootstrapped (idempotent)
  composeContainer();

  // Real server — full DI, all tools/resources/prompts registered
  const server = await createMcpServerInstance();

  // Paired in-process transports — no network
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  // Client with optional capabilities (elicitation, sampling, roots)
  const client = new Client(
    { name: 'conformance-test-client', version: '1.0.0' },
    clientCapabilities ? { capabilities: clientCapabilities } : {},
  );

  // Connect both sides — triggers the initialize handshake
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return {
    client,
    server,
    cleanup: async () => {
      await client.close();
      await server.close();
    },
  };
}
