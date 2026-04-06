/**
 * @fileoverview Tests for MCP Apps builders — `appTool()` and `appResource()`.
 * Verifies auto-populated `_meta.ui`, compat keys, MIME type defaults,
 * annotation defaults, and passthrough of all standard fields.
 * @module tests/unit/mcp-server/apps/appBuilders.test
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { APP_RESOURCE_MIME_TYPE, appResource, appTool } from '@/mcp-server/apps/appBuilders.js';
import { createMockContext } from '@/testing/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const minimalInput = z.object({ query: z.string().describe('Search query') });
const minimalOutput = z.object({ result: z.string().describe('Result') });

// ---------------------------------------------------------------------------
// appTool()
// ---------------------------------------------------------------------------

describe('appTool()', () => {
  it('sets name from first argument', () => {
    const def = appTool('my_app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Test app tool',
      input: minimalInput,
      output: minimalOutput,
      handler: () => ({ result: 'ok' }),
    });

    expect(def.name).toBe('my_app_tool');
  });

  it('populates _meta.ui.resourceUri', () => {
    const def = appTool('app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Test',
      input: minimalInput,
      output: minimalOutput,
      handler: () => ({ result: 'ok' }),
    });

    expect(def._meta?.ui).toEqual({ resourceUri: 'ui://my-app/app.html' });
  });

  it('populates the backwards-compat "ui/resourceUri" key', () => {
    const def = appTool('app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Test',
      input: minimalInput,
      output: minimalOutput,
      handler: () => ({ result: 'ok' }),
    });

    expect(def._meta?.['ui/resourceUri']).toBe('ui://my-app/app.html');
  });

  it('merges extraMeta into _meta', () => {
    const def = appTool('app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Test',
      input: minimalInput,
      output: minimalOutput,
      extraMeta: { vendor: { featureFlag: true } },
      handler: () => ({ result: 'ok' }),
    });

    expect(def._meta?.vendor).toEqual({ featureFlag: true });
    // ui and compat key still present
    expect(def._meta?.ui).toEqual({ resourceUri: 'ui://my-app/app.html' });
    expect(def._meta?.['ui/resourceUri']).toBe('ui://my-app/app.html');
  });

  it('ui key takes precedence over extraMeta.ui (auto-populated wins)', () => {
    const def = appTool('app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Test',
      input: minimalInput,
      output: minimalOutput,
      extraMeta: { ui: { resourceUri: 'ui://SHOULD-NOT-WIN/app.html' } },
      handler: () => ({ result: 'ok' }),
    });

    // Auto-populated value wins because it's spread after extraMeta
    expect(def._meta?.ui).toEqual({ resourceUri: 'ui://my-app/app.html' });
  });

  it('preserves description', () => {
    const def = appTool('app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Interactive widget',
      input: minimalInput,
      output: minimalOutput,
      handler: () => ({ result: 'ok' }),
    });

    expect(def.description).toBe('Interactive widget');
  });

  it('preserves input and output schemas', () => {
    const input = z.object({ x: z.number().describe('X value') });
    const output = z.object({ doubled: z.number().describe('Doubled') });

    const def = appTool('app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Test',
      input,
      output,
      handler: (i) => ({ doubled: i.x * 2 }),
    });

    expect(def.input).toBe(input);
    expect(def.output).toBe(output);
    const parsed = def.input.parse({ x: 5 });
    expect(parsed.x).toBe(5);
  });

  it('preserves handler and it works', async () => {
    const def = appTool('app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Test',
      input: z.object({ msg: z.string().describe('Message') }),
      output: z.object({ echo: z.string().describe('Echo') }),
      handler: (input) => ({ echo: `Echo: ${input.msg}` }),
    });

    const ctx = createMockContext();
    const result = await def.handler(def.input.parse({ msg: 'hello' }), ctx);
    expect(result.echo).toBe('Echo: hello');
  });

  it('preserves annotations', () => {
    const def = appTool('app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Test',
      input: minimalInput,
      output: minimalOutput,
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: () => ({ result: 'ok' }),
    });

    expect(def.annotations?.readOnlyHint).toBe(true);
    expect(def.annotations?.openWorldHint).toBe(false);
  });

  it('preserves auth scopes', () => {
    const def = appTool('app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Test',
      input: minimalInput,
      output: minimalOutput,
      auth: ['tool:app_tool:read'],
      handler: () => ({ result: 'ok' }),
    });

    expect(def.auth).toEqual(['tool:app_tool:read']);
  });

  it('preserves format function', () => {
    const def = appTool('app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Test',
      input: minimalInput,
      output: minimalOutput,
      handler: () => ({ result: 'data' }),
      format: (r) => [
        { type: 'text', text: JSON.stringify(r) },
        { type: 'text', text: `Result: ${r.result}` },
      ],
    });

    const blocks = def.format!({ result: 'data' });
    expect(blocks).toHaveLength(2);
    expect(JSON.parse((blocks[0] as { text: string }).text)).toEqual({ result: 'data' });
    expect((blocks[1] as { text: string }).text).toBe('Result: data');
  });

  it('preserves title', () => {
    const def = appTool('app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Test',
      title: 'My App Tool',
      input: minimalInput,
      output: minimalOutput,
      handler: () => ({ result: 'ok' }),
    });

    expect(def.title).toBe('My App Tool');
  });

  it('preserves task flag', () => {
    const def = appTool('app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Test',
      task: true,
      input: minimalInput,
      output: minimalOutput,
      handler: () => ({ result: 'ok' }),
    });

    expect(def.task).toBe(true);
  });

  it('does not leak resourceUri or extraMeta as top-level fields', () => {
    const def = appTool('app_tool', {
      resourceUri: 'ui://my-app/app.html',
      description: 'Test',
      input: minimalInput,
      output: minimalOutput,
      extraMeta: { custom: true },
      handler: () => ({ result: 'ok' }),
    });

    expect((def as unknown as Record<string, unknown>).resourceUri).toBeUndefined();
    expect((def as unknown as Record<string, unknown>).extraMeta).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// appResource()
// ---------------------------------------------------------------------------

describe('appResource()', () => {
  it('sets uriTemplate from first argument', () => {
    const def = appResource('ui://my-app/app.html', {
      description: 'App UI',
      handler: () => '<html></html>',
    });

    expect(def.uriTemplate).toBe('ui://my-app/app.html');
  });

  it('defaults mimeType to APP_RESOURCE_MIME_TYPE', () => {
    const def = appResource('ui://my-app/app.html', {
      description: 'App UI',
      handler: () => '<html></html>',
    });

    expect(def.mimeType).toBe(APP_RESOURCE_MIME_TYPE);
    expect(def.mimeType).toBe('text/html;profile=mcp-app');
  });

  it('allows overriding mimeType', () => {
    const def = appResource('ui://my-app/app.html', {
      description: 'App UI',
      mimeType: 'text/html',
      handler: () => '<html></html>',
    });

    expect(def.mimeType).toBe('text/html');
  });

  it('defaults annotations.audience to ["user"]', () => {
    const def = appResource('ui://my-app/app.html', {
      description: 'App UI',
      handler: () => '<html></html>',
    });

    expect(def.annotations?.audience).toEqual(['user']);
  });

  it('allows overriding annotations.audience', () => {
    const def = appResource('ui://my-app/app.html', {
      description: 'App UI',
      annotations: { audience: ['user', 'assistant'] },
      handler: () => '<html></html>',
    });

    expect(def.annotations?.audience).toEqual(['user', 'assistant']);
  });

  it('preserves additional annotation fields alongside default audience', () => {
    const def = appResource('ui://my-app/app.html', {
      description: 'App UI',
      annotations: { priority: 0.9 },
      handler: () => '<html></html>',
    });

    // audience default applies, priority is preserved
    expect(def.annotations?.audience).toEqual(['user']);
    expect(def.annotations?.priority).toBe(0.9);
  });

  it('preserves description', () => {
    const def = appResource('ui://my-app/app.html', {
      description: 'Interactive UI for my app tool.',
      handler: () => '<html></html>',
    });

    expect(def.description).toBe('Interactive UI for my app tool.');
  });

  it('preserves name', () => {
    const def = appResource('ui://my-app/app.html', {
      name: 'my-app-ui',
      description: 'App UI',
      handler: () => '<html></html>',
    });

    expect(def.name).toBe('my-app-ui');
  });

  it('preserves title', () => {
    const def = appResource('ui://my-app/app.html', {
      title: 'My App UI',
      description: 'App UI',
      handler: () => '<html></html>',
    });

    expect(def.title).toBe('My App UI');
  });

  it('preserves params schema', () => {
    const params = z.object({ theme: z.string().describe('Theme name') });
    const def = appResource('ui://my-app/app.html', {
      description: 'App UI',
      params,
      handler: () => '<html></html>',
    });

    expect(def.params).toBe(params);
    expect(def.params!.parse({ theme: 'dark' })).toEqual({ theme: 'dark' });
  });

  it('preserves auth scopes', () => {
    const def = appResource('ui://my-app/app.html', {
      description: 'App UI',
      auth: ['resource:my-app-ui:read'],
      handler: () => '<html></html>',
    });

    expect(def.auth).toEqual(['resource:my-app-ui:read']);
  });

  it('preserves handler and it works', () => {
    const html = '<!DOCTYPE html><html><body>Hello</body></html>';
    const def = appResource('ui://my-app/app.html', {
      description: 'App UI',
      handler: () => html,
    });

    const result = def.handler({}, {} as any);
    expect(result).toBe(html);
  });

  it('preserves async handler', async () => {
    const def = appResource('ui://my-app/app.html', {
      description: 'App UI',
      handler: async () => '<html>async</html>',
    });

    const result = await def.handler({}, {} as any);
    expect(result).toBe('<html>async</html>');
  });

  it('preserves list function', async () => {
    const def = appResource('ui://my-app/app.html', {
      description: 'App UI',
      handler: () => '<html></html>',
      list: () => ({
        resources: [{ uri: 'ui://my-app/app.html', name: 'My App' }],
      }),
    });

    const listing = await def.list!({} as any);
    expect(listing.resources).toHaveLength(1);
    expect(listing.resources[0]!.uri).toBe('ui://my-app/app.html');
  });

  it('preserves _meta', () => {
    const def = appResource('ui://my-app/app.html', {
      description: 'App UI',
      _meta: {
        ui: {
          csp: { resource_domains: ['https://cdn.example.com'] },
          permissions: ['microphone'],
        },
      },
      handler: () => '<html></html>',
    });

    expect(def._meta?.ui).toEqual({
      csp: { resource_domains: ['https://cdn.example.com'] },
      permissions: ['microphone'],
    });
  });

  it('does not leak mimeType override into a second field', () => {
    const def = appResource('ui://my-app/app.html', {
      description: 'App UI',
      mimeType: 'text/html',
      handler: () => '<html></html>',
    });

    // Only one mimeType field, no duplication
    expect(def.mimeType).toBe('text/html');
    const keys = Object.keys(def).filter((k) => k === 'mimeType');
    expect(keys).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// APP_RESOURCE_MIME_TYPE constant
// ---------------------------------------------------------------------------

describe('APP_RESOURCE_MIME_TYPE', () => {
  it('matches the ext-apps spec value', () => {
    expect(APP_RESOURCE_MIME_TYPE).toBe('text/html;profile=mcp-app');
  });
});
