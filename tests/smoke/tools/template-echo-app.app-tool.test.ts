/**
 * @fileoverview Smoke tests for the MCP Apps echo app tool pattern.
 * Uses appTool() builder directly to validate the same pattern as the
 * template (templates/ has its own package.json that prevents direct import).
 * @module tests/smoke/tools/template-echo-app.app-tool.test
 */

import { createMockContext } from '@cyanheads/mcp-ts-core/testing';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { appTool } from '@/mcp-server/apps/appBuilders.js';

/** Mirrors the template echo app tool definition. */
const UI_RESOURCE_URI = 'ui://template-echo-app/app.html';

const echoAppTool = appTool('template_echo_app', {
  resourceUri: UI_RESOURCE_URI,
  title: 'Echo App',
  description: 'Echoes a message with an interactive UI.',
  annotations: { readOnlyHint: true },
  input: z.object({
    message: z.string().describe('The message to echo.'),
  }),
  output: z.object({
    message: z.string().describe('The echoed message.'),
    timestamp: z.string().describe('ISO 8601 timestamp of the echo.'),
  }),

  handler(input, ctx) {
    ctx.log.debug('Echo app called.', { message: input.message });
    return {
      message: input.message,
      timestamp: new Date().toISOString(),
    };
  },

  format(result) {
    const jsonBlock = JSON.stringify(result);
    const textBlock = `**Echo:** ${result.message}\n**Time:** ${result.timestamp}`;
    return [
      { type: 'text', text: jsonBlock },
      { type: 'text', text: textBlock },
    ];
  },
});

describe('echoAppTool (MCP Apps pattern)', () => {
  it('echoes the input message', async () => {
    const ctx = createMockContext();
    const input = echoAppTool.input.parse({ message: 'hello world' });
    const result = await echoAppTool.handler(input, ctx);
    expect(result.message).toBe('hello world');
  });

  it('includes an ISO 8601 timestamp', async () => {
    const ctx = createMockContext();
    const input = echoAppTool.input.parse({ message: 'test' });
    const result = await echoAppTool.handler(input, ctx);
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });

  it('output validates against the output schema', async () => {
    const ctx = createMockContext();
    const input = echoAppTool.input.parse({ message: 'test' });
    const result = await echoAppTool.handler(input, ctx);
    const parsed = echoAppTool.output.parse(result);
    expect(parsed.message).toBe('test');
    expect(parsed.timestamp).toBe(result.timestamp);
  });

  it('format returns JSON block + text block', () => {
    const result = {
      message: 'hello',
      timestamp: '2026-04-06T12:00:00.000Z',
    };
    const blocks = echoAppTool.format!(result);

    expect(blocks).toHaveLength(2);

    // First block: parseable JSON for the MCP App UI
    const jsonBlock = (blocks[0] as { text: string }).text;
    const parsed = JSON.parse(jsonBlock);
    expect(parsed.message).toBe('hello');
    expect(parsed.timestamp).toBe('2026-04-06T12:00:00.000Z');

    // Second block: human-readable fallback
    const textBlock = (blocks[1] as { text: string }).text;
    expect(textBlock).toContain('hello');
    expect(textBlock).toContain('2026-04-06T12:00:00.000Z');
  });

  it('has _meta.ui.resourceUri pointing to the echo app UI', () => {
    expect(echoAppTool._meta?.ui).toEqual({
      resourceUri: UI_RESOURCE_URI,
    });
  });

  it('has _meta["ui/resourceUri"] compat key', () => {
    expect(echoAppTool._meta?.['ui/resourceUri']).toBe(UI_RESOURCE_URI);
  });

  it('has readOnlyHint annotation', () => {
    expect(echoAppTool.annotations?.readOnlyHint).toBe(true);
  });

  it('has a title', () => {
    expect(echoAppTool.title).toBe('Echo App');
  });

  it('rejects missing message via input schema', () => {
    const result = echoAppTool.input.safeParse({});
    expect(result.success).toBe(false);
  });
});
