/**
 * @fileoverview Protocol version negotiation conformance tests.
 * Validates that the server correctly negotiates protocol versions using
 * raw transport (no SDK Client) to control the exact initialize message.
 * @module tests/conformance/version-negotiation
 */
import { describe, expect, it } from 'vitest';

import { createRawServerTransport, rawInitialize } from './helpers/low-level-helpers.js';

describe('Protocol version negotiation', () => {
  it('accepts a supported protocol version', async () => {
    const { clientTransport, cleanup } = await createRawServerTransport();

    const response = await rawInitialize(clientTransport, {
      protocolVersion: '2025-06-18',
    });

    expect(response.result).toBeDefined();
    const result = response.result as Record<string, unknown>;
    expect(typeof result.protocolVersion).toBe('string');
    expect((result.protocolVersion as string).length).toBeGreaterThan(0);

    await cleanup();
  });

  it('responds with a supported version when client sends an unsupported past version', async () => {
    const { clientTransport, cleanup } = await createRawServerTransport();

    const response = await rawInitialize(clientTransport, {
      protocolVersion: '1999-01-01',
    });

    expect(response.result).toBeDefined();
    const result = response.result as Record<string, unknown>;
    // Server MUST respond with a version it supports, not echo the unsupported one
    expect(result.protocolVersion).not.toBe('1999-01-01');
    expect(typeof result.protocolVersion).toBe('string');
    expect((result.protocolVersion as string).length).toBeGreaterThan(0);

    await cleanup();
  });

  it('responds with a supported version when client sends a future version', async () => {
    const { clientTransport, cleanup } = await createRawServerTransport();

    const response = await rawInitialize(clientTransport, {
      protocolVersion: '2099-12-31',
    });

    expect(response.result).toBeDefined();
    const result = response.result as Record<string, unknown>;
    // Server MUST respond with its own supported version, not the far-future one
    expect(result.protocolVersion).not.toBe('2099-12-31');
    expect(typeof result.protocolVersion).toBe('string');
    expect((result.protocolVersion as string).length).toBeGreaterThan(0);

    await cleanup();
  });
});
