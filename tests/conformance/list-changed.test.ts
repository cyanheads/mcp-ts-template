/**
 * @fileoverview listChanged notification conformance tests.
 * Validates that the server emits list_changed notifications when tools,
 * resources, or prompts are added/removed at runtime, per the MCP spec.
 * @module tests/conformance/list-changed
 */

import {
  PromptListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { type ConformanceHarness, createConformanceHarness } from './helpers/server-harness.js';

/** Helper: create a promise that resolves on notification, rejects on timeout. */
function notificationPromise(timeoutMs = 2000): {
  promise: Promise<void>;
  reject: (reason: unknown) => void;
  resolve: () => void;
} {
  const { promise, reject, resolve } = Promise.withResolvers<void>();
  const timer = setTimeout(() => reject(new Error('Notification timeout')), timeoutMs);

  return {
    promise: promise.finally(() => clearTimeout(timer)),
    reject,
    resolve,
  };
}

describe('listChanged notification conformance', () => {
  let harness: ConformanceHarness;

  beforeAll(async () => {
    harness = await createConformanceHarness();
  });

  afterAll(async () => {
    await harness?.cleanup();
  });

  // -- Capability advertisement -------------------------------------------

  it('server declares tools.listChanged: true', () => {
    const caps = harness.client.getServerCapabilities();
    expect(caps?.tools?.listChanged).toBe(true);
  });

  it('server declares resources.listChanged: true', () => {
    const caps = harness.client.getServerCapabilities();
    expect(caps?.resources?.listChanged).toBe(true);
  });

  it('server declares prompts.listChanged: true', () => {
    const caps = harness.client.getServerCapabilities();
    expect(caps?.prompts?.listChanged).toBe(true);
  });

  // -- Tools: add / list / remove ----------------------------------------

  describe('tool list_changed lifecycle', () => {
    const RUNTIME_TOOL_NAME = 'conformance_runtime_tool';

    it('emits list_changed when a tool is added, and tool appears in listing', async () => {
      const { promise, resolve } = notificationPromise();
      harness.client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
        resolve();
      });

      // Dynamically add a tool at runtime
      const handle = harness.server.tool(
        RUNTIME_TOOL_NAME,
        { message: z.string() },
        async (args) => ({
          content: [{ text: args.message, type: 'text' as const }],
        }),
      );

      await promise;

      // Verify the tool is now listed
      const { tools } = await harness.client.listTools();
      const added = tools.find((t) => t.name === RUNTIME_TOOL_NAME);
      expect(added).toBeDefined();
      expect(added?.inputSchema).toBeDefined();

      // Clean up: remove and wait for the second notification
      const { promise: removePromise, resolve: removeResolve } = notificationPromise();
      harness.client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
        removeResolve();
      });

      handle.remove();
      await removePromise;
    });

    it('tool no longer appears after removal', async () => {
      // The previous test removed the tool — confirm it's gone
      const { tools } = await harness.client.listTools();
      const removed = tools.find((t) => t.name === RUNTIME_TOOL_NAME);
      expect(removed).toBeUndefined();
    });

    it('emits list_changed on enable/disable', async () => {
      // Add a tool
      const { promise: addPromise, resolve: addResolve } = notificationPromise();
      harness.client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
        addResolve();
      });

      const handle = harness.server.tool(
        'conformance_toggle_tool',
        { value: z.string() },
        async (args) => ({
          content: [{ text: args.value, type: 'text' as const }],
        }),
      );

      await addPromise;

      // Disable
      const { promise: disablePromise, resolve: disableResolve } = notificationPromise();
      harness.client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
        disableResolve();
      });

      handle.disable();
      await disablePromise;

      // Disabled tool should not appear in listing
      const { tools: afterDisable } = await harness.client.listTools();
      expect(afterDisable.find((t) => t.name === 'conformance_toggle_tool')).toBeUndefined();

      // Re-enable
      const { promise: enablePromise, resolve: enableResolve } = notificationPromise();
      harness.client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
        enableResolve();
      });

      handle.enable();
      await enablePromise;

      // Should appear again
      const { tools: afterEnable } = await harness.client.listTools();
      expect(afterEnable.find((t) => t.name === 'conformance_toggle_tool')).toBeDefined();

      // Cleanup
      const { promise: cleanupPromise, resolve: cleanupResolve } = notificationPromise();
      harness.client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
        cleanupResolve();
      });

      handle.remove();
      await cleanupPromise;
    });
  });

  // -- Resources: listChanged notification --------------------------------

  describe('resource list_changed', () => {
    it('emits list_changed when a resource is added via server.resource()', async () => {
      const { promise, resolve } = notificationPromise();
      harness.client.setNotificationHandler(ResourceListChangedNotificationSchema, () => {
        resolve();
      });

      // McpServer.resource() triggers a listChanged notification
      harness.server.resource('conformance-test-resource', 'conformance://test', async () => ({
        contents: [{ text: 'conformance', uri: 'conformance://test' }],
      }));

      await promise;

      // Verify the resource appears in listing
      const { resources } = await harness.client.listResources();
      const added = resources.find((r) => r.uri === 'conformance://test');
      expect(added).toBeDefined();
    });
  });

  // -- Prompts: listChanged notification ----------------------------------

  describe('prompt list_changed', () => {
    it('emits list_changed when a prompt is added via server.prompt()', async () => {
      const { promise, resolve } = notificationPromise();
      harness.client.setNotificationHandler(PromptListChangedNotificationSchema, () => {
        resolve();
      });

      harness.server.prompt('conformance_test_prompt', async () => ({
        messages: [
          {
            content: { text: 'conformance test prompt', type: 'text' as const },
            role: 'user' as const,
          },
        ],
      }));

      await promise;

      // Verify the prompt appears in listing
      const { prompts } = await harness.client.listPrompts();
      const added = prompts.find((p) => p.name === 'conformance_test_prompt');
      expect(added).toBeDefined();
    });
  });
});
