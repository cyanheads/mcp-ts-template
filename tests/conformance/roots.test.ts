/**
 * @fileoverview Roots capability conformance tests.
 * Validates that the server correctly negotiates roots capability during
 * the MCP handshake, and that connections succeed both with and without
 * roots declared by the client.
 *
 * The RootsRegistry in this project is a placeholder that logs capability
 * enablement. Actual root retrieval happens via sdkContext from within tool
 * logic. These tests focus on capability negotiation and handshake behavior.
 * @module tests/conformance/roots
 */

import type { ClientCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type ConformanceHarness, createConformanceHarness } from './helpers/server-harness.js';

describe('Roots capability conformance', () => {
  // ── Client WITH roots capability ─────────────────────────────────────────

  describe('client with roots capability', () => {
    let harness: ConformanceHarness;

    const capabilities: ClientCapabilities = { roots: { listChanged: true } };

    beforeAll(async () => {
      harness = await createConformanceHarness(capabilities);
    });

    afterAll(async () => {
      await harness?.cleanup();
    });

    it('completes handshake with roots capability declared', () => {
      expect(harness.client).toBeDefined();
      expect(harness.server).toBeDefined();
    });

    it('server reports correct identity after roots-enabled handshake', () => {
      const serverVersion = harness.client.getServerVersion();
      expect(serverVersion).toBeDefined();
      expect(serverVersion?.name).toBeTruthy();
      expect(serverVersion?.version).toBeTruthy();
    });

    it('server capabilities are fully advertised alongside roots', () => {
      const caps = harness.client.getServerCapabilities();
      expect(caps).toBeDefined();
      // Core capabilities should still be present
      expect(caps?.tools).toBeDefined();
      expect(caps?.resources).toBeDefined();
      expect(caps?.prompts).toBeDefined();
      expect(caps?.logging).toBeDefined();
    });

    it('tools are accessible with roots-enabled client', async () => {
      const { tools } = await harness.client.listTools();
      expect(tools.length).toBeGreaterThan(0);
    });

    it('resources are accessible with roots-enabled client', async () => {
      const result = await harness.client.listResources();
      // Resources may be empty but the call should succeed
      expect(result).toBeDefined();
    });
  });

  // ── Client WITHOUT roots capability ──────────────────────────────────────

  describe('client without roots capability', () => {
    let harness: ConformanceHarness;

    beforeAll(async () => {
      // Empty capabilities — no roots
      harness = await createConformanceHarness({});
    });

    afterAll(async () => {
      await harness?.cleanup();
    });

    it('completes handshake without roots capability', () => {
      expect(harness.client).toBeDefined();
      expect(harness.server).toBeDefined();
    });

    it('server capabilities are unaffected by missing roots', () => {
      const caps = harness.client.getServerCapabilities();
      expect(caps).toBeDefined();
      expect(caps?.tools).toBeDefined();
      expect(caps?.resources).toBeDefined();
      expect(caps?.prompts).toBeDefined();
    });

    it('tools remain fully functional without roots', async () => {
      const result = await harness.client.callTool({
        arguments: { message: 'roots-test' },
        name: 'template_echo_message',
      });

      expect(result).toBeDefined();
      expect(result.isError).toBeFalsy();

      if ('content' in result && Array.isArray(result.content)) {
        const textBlock = (result.content as { text?: string; type: string }[]).find(
          (b) => b.type === 'text',
        );
        expect(textBlock?.text).toContain('roots-test');
      }
    });
  });

  // ── Roots with listChanged: false ────────────────────────────────────────

  describe('client with roots but no listChanged', () => {
    let harness: ConformanceHarness;

    const capabilities: ClientCapabilities = { roots: { listChanged: false } };

    beforeAll(async () => {
      harness = await createConformanceHarness(capabilities);
    });

    afterAll(async () => {
      await harness?.cleanup();
    });

    it('completes handshake with listChanged disabled', () => {
      expect(harness.client).toBeDefined();
      expect(harness.server).toBeDefined();
    });

    it('server capabilities are fully advertised', () => {
      const caps = harness.client.getServerCapabilities();
      expect(caps).toBeDefined();
      expect(caps?.tools?.listChanged).toBe(true);
      expect(caps?.resources?.listChanged).toBe(true);
    });
  });
});
