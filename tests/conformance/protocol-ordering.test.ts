/**
 * @fileoverview Layer 2 wire-level ordering conformance tests.
 * Validates protocol invariants across the full message trace using
 * RecordingTransport to capture every JSON-RPC message.
 * @module tests/conformance/protocol-ordering
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type ConformanceHarness, createConformanceHarness } from './helpers/server-harness.js';

describe('Protocol ordering conformance', () => {
  let harness: ConformanceHarness;

  beforeAll(async () => {
    harness = await createConformanceHarness({}, { recording: true });

    // Generate some protocol traffic beyond the init handshake
    await harness.client.listTools();
    await harness.client.callTool({
      arguments: { message: 'ordering-test' },
      name: 'template_echo_message',
    });
  });

  afterAll(async () => {
    await harness?.cleanup();
  });

  it('first client message is initialize', () => {
    const recorder = harness.recorder!;
    const clientMessages = recorder.byDirection('client-to-server');

    expect(clientMessages.length).toBeGreaterThan(0);
    expect(clientMessages[0]!.method).toBe('initialize');
  });

  it('notifications/initialized follows initialize in client messages', () => {
    const recorder = harness.recorder!;
    const clientMessages = recorder.byDirection('client-to-server');
    const methods = clientMessages.map((m) => m.method);

    const initializeIdx = methods.indexOf('initialize');
    const initializedIdx = methods.indexOf('notifications/initialized');

    expect(initializeIdx).toBeGreaterThanOrEqual(0);
    expect(initializedIdx).toBeGreaterThan(initializeIdx);
  });

  it('all client-side request IDs are unique', () => {
    const recorder = harness.recorder!;
    const clientMessages = recorder.byDirection('client-to-server');

    // Only requests have IDs — notifications have null
    const ids = clientMessages.filter((m) => m.id !== null).map((m) => m.id);

    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('every request has a corresponding response', () => {
    const recorder = harness.recorder!;
    const clientMessages = recorder.byDirection('client-to-server');
    const serverMessages = recorder.byDirection('server-to-client');

    // Client requests: have an id and a method (notifications have method but no id in responses)
    const requestIds = new Set(
      clientMessages.filter((m) => m.id !== null && m.method !== null).map((m) => m.id),
    );

    // Server responses: have an id but no method
    const responseIds = new Set(
      serverMessages.filter((m) => m.id !== null && m.method === null).map((m) => m.id),
    );

    // Every client request should have a server response
    for (const id of requestIds) {
      expect(responseIds.has(id), `Missing response for request id=${id}`).toBe(true);
    }
  });

  it('no non-initialize requests before notifications/initialized', () => {
    const recorder = harness.recorder!;
    const clientMessages = recorder.byDirection('client-to-server');

    const initializedIdx = clientMessages.findIndex(
      (m) => m.method === 'notifications/initialized',
    );
    expect(initializedIdx).toBeGreaterThan(0);

    // Everything before notifications/initialized should be either
    // 'initialize' (the request) or null method (a response)
    const beforeInitialized = clientMessages.slice(0, initializedIdx);
    for (const msg of beforeInitialized) {
      expect(
        msg.method === 'initialize' || msg.method === null,
        `Unexpected client message before initialized: ${msg.method}`,
      ).toBe(true);
    }
  });

  it('server-to-client notifications have correct direction', () => {
    const recorder = harness.recorder!;
    const serverMessages = recorder.byDirection('server-to-client');

    // Notifications: have a method but no id
    const notifications = serverMessages.filter((m) => m.method !== null && m.id === null);

    for (const notif of notifications) {
      expect(notif.direction).toBe('server-to-client');
      // Notification methods should be strings starting with "notifications/" or similar
      expect(typeof notif.method).toBe('string');
    }
  });
});
