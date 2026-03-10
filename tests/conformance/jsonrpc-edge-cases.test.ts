/**
 * @fileoverview JSON-RPC protocol edge case conformance tests.
 * Validates behavior for unknown methods, extra fields, and notification handling
 * using raw transport to send precise JSON-RPC messages.
 * @module tests/conformance/jsonrpc-edge-cases
 */
import { describe, expect, it } from 'vitest';

import {
  createRawServerTransport,
  rawInitialize,
  sendInitializedNotification,
  sendRawAndCollect,
} from './helpers/low-level-helpers.js';

describe('JSON-RPC edge cases', () => {
  it('returns -32601 (method not found) for unknown methods', async () => {
    const { clientTransport, cleanup } = await createRawServerTransport();
    await rawInitialize(clientTransport);
    await sendInitializedNotification(clientTransport);

    const response = await sendRawAndCollect(clientTransport, {
      id: 99,
      jsonrpc: '2.0',
      method: 'nonexistent/method',
      params: {},
    });

    expect(response.error).toBeDefined();
    const error = response.error as Record<string, unknown>;
    expect(error.code).toBe(-32601);

    await cleanup();
  });

  it('tolerates extra fields in request params', async () => {
    const { clientTransport, cleanup } = await createRawServerTransport();
    await rawInitialize(clientTransport);
    await sendInitializedNotification(clientTransport);

    // Extra fields in `params` (not at the top-level of the JSON-RPC envelope)
    // should be ignored by the server. Top-level extra fields may cause the
    // SDK transport to drop the message (schema validation at the transport layer).
    const response = await sendRawAndCollect(clientTransport, {
      id: 100,
      jsonrpc: '2.0',
      method: 'tools/list',
      params: { extraField: 'should-be-ignored' },
    });

    // Should succeed — extra fields in params are tolerated
    expect(response.result).toBeDefined();
    const result = response.result as Record<string, unknown>;
    expect(result.tools).toBeDefined();
    expect(Array.isArray(result.tools)).toBe(true);

    await cleanup();
  });

  it('does not respond to notifications (messages without id)', async () => {
    const { clientTransport, cleanup } = await createRawServerTransport();
    await rawInitialize(clientTransport);
    await sendInitializedNotification(clientTransport);

    // Send a notification (no id field) — server MUST NOT respond
    const noResponsePromise = sendRawAndCollect(
      clientTransport,
      {
        jsonrpc: '2.0',
        method: 'some/notification',
      },
      500,
    );

    await expect(noResponsePromise).rejects.toThrow(/timeout/i);

    await cleanup();
  });
});
