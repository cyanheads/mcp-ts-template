/**
 * @fileoverview Protocol initialization and capability negotiation conformance tests.
 * Validates the MCP initialize handshake, server identity, and capability advertisement.
 * @module tests/conformance/protocol-init
 */
import { describe, it, expect, afterAll } from 'vitest';

import { config } from '@/config/index.js';
import {
  createConformanceHarness,
  type ConformanceHarness,
} from './helpers/server-harness.js';

describe('Protocol initialization', () => {
  let harness: ConformanceHarness;

  afterAll(async () => {
    await harness?.cleanup();
  });

  it('completes the initialize handshake', async () => {
    // If createConformanceHarness succeeds, the handshake completed
    harness = await createConformanceHarness();
    expect(harness.client).toBeDefined();
  });

  it('reports correct server identity', () => {
    const serverVersion = harness.client.getServerVersion();
    expect(serverVersion).toBeDefined();
    expect(serverVersion!.name).toBe(config.mcpServerName);
    expect(serverVersion!.version).toBe(config.mcpServerVersion);
  });

  it('advertises tools capability with listChanged', () => {
    const caps = harness.client.getServerCapabilities();
    expect(caps).toBeDefined();
    expect(caps!.tools).toBeDefined();
    expect(caps!.tools!.listChanged).toBe(true);
  });

  it('advertises resources capability with listChanged', () => {
    const caps = harness.client.getServerCapabilities();
    expect(caps!.resources).toBeDefined();
    expect(caps!.resources!.listChanged).toBe(true);
  });

  it('advertises prompts capability with listChanged', () => {
    const caps = harness.client.getServerCapabilities();
    expect(caps!.prompts).toBeDefined();
    expect(caps!.prompts!.listChanged).toBe(true);
  });

  it('advertises logging capability', () => {
    const caps = harness.client.getServerCapabilities();
    expect(caps!.logging).toBeDefined();
  });

  it('responds to ping', async () => {
    const result = await harness.client.ping();
    expect(result).toBeDefined();
  });
});
