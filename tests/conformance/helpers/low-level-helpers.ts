/**
 * @fileoverview Low-level JSON-RPC helpers for conformance tests that need
 * raw transport access (version negotiation, edge cases). Bypasses the SDK
 * Client to test protocol-level behavior directly.
 * @module tests/conformance/helpers/low-level-helpers
 */
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

import { createApp } from '@/app.js';

type IMTransport = InstanceType<typeof InMemoryTransport>;

/**
 * Creates a raw server + linked transport pair for low-level protocol testing.
 * The server is connected but no SDK Client is used — you send raw JSON-RPC
 * messages directly on `clientTransport`.
 */
export async function createRawServerTransport(): Promise<{
  clientTransport: IMTransport;
  cleanup: () => Promise<void>;
  server: McpServer;
  serverTransport: IMTransport;
}> {
  const { createServer } = await createApp();
  const server = await createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  return {
    clientTransport,
    cleanup: async () => {
      await server.close();
    },
    server,
    serverTransport,
  };
}

/**
 * Sends a raw JSON-RPC message and waits for the next response on the transport.
 * Pass the **client-side** transport — it sends to the server and receives
 * the server's response via the linked pair.
 */
export async function sendRawAndCollect(
  transport: IMTransport,
  message: Record<string, unknown>,
  timeoutMs = 5000,
): Promise<Record<string, unknown>> {
  const { promise, resolve, reject } = Promise.withResolvers<Record<string, unknown>>();
  const timer = setTimeout(() => reject(new Error('Timeout waiting for response')), timeoutMs);

  const originalHandler = transport.onmessage;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (transport as any).onmessage = (msg: JSONRPCMessage) => {
    clearTimeout(timer);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (transport as any).onmessage = originalHandler;
    resolve(msg as unknown as Record<string, unknown>);
  };

  await transport.send(message as JSONRPCMessage);
  return promise;
}

/**
 * Performs a raw initialize handshake, returning the server's response.
 * Useful for tests that need to control the protocol version or capabilities.
 */
export async function rawInitialize(
  transport: IMTransport,
  overrides?: {
    capabilities?: Record<string, unknown>;
    clientInfo?: { name: string; version: string };
    protocolVersion?: string;
  },
): Promise<Record<string, unknown>> {
  return sendRawAndCollect(transport, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: overrides?.protocolVersion ?? '2025-06-18',
      capabilities: overrides?.capabilities ?? {},
      clientInfo: overrides?.clientInfo ?? { name: 'raw-test-client', version: '1.0.0' },
    },
  });
}

/**
 * Sends the `notifications/initialized` notification after a successful initialize.
 * Required to complete the handshake before sending other requests.
 */
export async function sendInitializedNotification(transport: IMTransport): Promise<void> {
  await transport.send({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  } as JSONRPCMessage);
  // Small delay to let the server process the notification
  await new Promise((r) => setTimeout(r, 50));
}
