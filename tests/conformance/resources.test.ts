/**
 * @fileoverview Resource protocol conformance tests.
 * Validates resource listing, template listing, and resource reading
 * through the full protocol stack.
 * @module tests/conformance/resources
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  createConformanceHarness,
  type ConformanceHarness,
} from './helpers/server-harness.js';

describe('Resource protocol conformance', () => {
  let harness: ConformanceHarness;

  beforeAll(async () => {
    harness = await createConformanceHarness();
  });

  afterAll(async () => {
    await harness?.cleanup();
  });

  // ── Listing ──────────────────────────────────────────────────────────────

  describe('listResources', () => {
    it('returns a resources array', async () => {
      const result = await harness.client.listResources();
      expect(result.resources).toBeDefined();
      expect(Array.isArray(result.resources)).toBe(true);
    });

    it('each resource has uri and name', async () => {
      const { resources } = await harness.client.listResources();
      for (const resource of resources) {
        expect(resource.uri).toBeTruthy();
        expect(typeof resource.uri).toBe('string');
        expect(resource.name).toBeTruthy();
        expect(typeof resource.name).toBe('string');
      }
    });

    it('includes the default echo resource', async () => {
      const { resources } = await harness.client.listResources();
      const echoResource = resources.find((r) => r.uri === 'echo://hello');
      expect(echoResource).toBeDefined();
      expect(echoResource!.name).toBe('Default Echo Message');
    });
  });

  // ── Resource templates ────────────────────────────────────────────────────

  describe('listResourceTemplates', () => {
    it('returns resource templates', async () => {
      const result = await harness.client.listResourceTemplates();
      expect(result.resourceTemplates).toBeDefined();
      expect(Array.isArray(result.resourceTemplates)).toBe(true);
    });

    it('includes echo resource template with URI pattern', async () => {
      const { resourceTemplates } =
        await harness.client.listResourceTemplates();
      const echoTemplate = resourceTemplates.find((t) =>
        t.uriTemplate.includes('echo'),
      );
      expect(echoTemplate).toBeDefined();
      expect(echoTemplate!.uriTemplate).toContain('{message}');
    });
  });

  // ── Reading ───────────────────────────────────────────────────────────────

  describe('readResource', () => {
    it('reads the echo resource with a valid URI', async () => {
      const result = await harness.client.readResource({
        uri: 'echo://hello-conformance',
      });

      expect(result.contents).toBeDefined();
      expect(result.contents.length).toBeGreaterThan(0);

      const content = result.contents[0]!;
      expect(content.uri).toBe('echo://hello-conformance');

      // Echo resource returns JSON text
      if ('text' in content) {
        const parsed = JSON.parse(content.text);
        expect(parsed.message).toBe('hello-conformance');
        expect(parsed.timestamp).toBeTruthy();
        expect(parsed.requestUri).toBe('echo://hello-conformance');
      }
    });

    it('echoes different messages from URI', async () => {
      const result = await harness.client.readResource({
        uri: 'echo://different-message',
      });

      expect(result.contents.length).toBeGreaterThan(0);
      const content = result.contents[0]!;
      if ('text' in content) {
        const parsed = JSON.parse(content.text);
        expect(parsed.message).toBe('different-message');
      }
    });

    it('rejects invalid resource URI', async () => {
      await expect(
        harness.client.readResource({
          uri: 'nonexistent://resource/that/does/not/exist',
        }),
      ).rejects.toThrow();
    });
  });
});
