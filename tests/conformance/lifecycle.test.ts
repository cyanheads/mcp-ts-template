/**
 * @fileoverview Transport lifecycle conformance tests.
 * Validates graceful shutdown, reconnection, and concurrent operation handling.
 * @module tests/conformance/lifecycle
 */
import { describe, it, expect } from 'vitest';

import { createConformanceHarness } from './helpers/server-harness.js';

describe('Lifecycle conformance', () => {
  it('handles graceful client disconnect after operations', async () => {
    const { client, cleanup } = await createConformanceHarness();

    // Prove the connection works
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);

    // Clean disconnect
    await cleanup();
    // If we reach here without unhandled rejection, lifecycle is correct
  });

  it('survives multiple connect/disconnect cycles', async () => {
    for (let i = 0; i < 3; i++) {
      const { client, cleanup } = await createConformanceHarness();
      const { tools } = await client.listTools();
      expect(tools.length).toBeGreaterThan(0);
      await cleanup();
    }
  });

  it('handles concurrent tool calls', async () => {
    const { client, cleanup } = await createConformanceHarness();

    const results = await Promise.all([
      client.callTool({
        name: 'template_echo_message',
        arguments: { message: 'concurrent-a' },
      }),
      client.callTool({
        name: 'template_echo_message',
        arguments: { message: 'concurrent-b' },
      }),
      client.callTool({
        name: 'template_echo_message',
        arguments: { message: 'concurrent-c' },
      }),
    ]);

    expect(results).toHaveLength(3);
    for (const result of results) {
      expect('content' in result).toBe(true);
      if ('isError' in result) {
        expect(result.isError).toBeFalsy();
      }
    }

    await cleanup();
  });

  it('handles concurrent mixed operations', async () => {
    const { client, cleanup } = await createConformanceHarness();

    const results = await Promise.allSettled([
      client.listTools(),
      client.listResources(),
      client.listPrompts(),
      client.callTool({
        name: 'template_echo_message',
        arguments: { message: 'mixed-ops' },
      }),
      client.readResource({ uri: 'echo://mixed-test' }),
      client.ping(),
    ]);

    // All operations should succeed
    for (const result of results) {
      expect(result.status).toBe('fulfilled');
    }

    await cleanup();
  });

  it('operations fail after client close', async () => {
    const { client, cleanup } = await createConformanceHarness();
    await cleanup();

    // Client should reject operations after close
    await expect(client.listTools()).rejects.toThrow();
  });
});
