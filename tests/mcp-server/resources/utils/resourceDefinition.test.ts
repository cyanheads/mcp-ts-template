/**
 * @fileoverview Tests for resource definition interface and builder.
 * @module tests/mcp-server/resources/utils/resourceDefinition.test
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type {
  ResourceAnnotations,
  ResourceDefinition,
} from '@/mcp-server/resources/utils/resourceDefinition.js';
import { resource } from '@/mcp-server/resources/utils/resourceDefinition.js';

describe('ResourceDefinition', () => {
  it('should be satisfiable with a minimal valid shape', () => {
    const definition: ResourceDefinition = {
      uriTemplate: 'test://{message}',
      description: 'A test resource',
      handler: () => ({ echo: 'hello' }),
    };

    expect(definition.uriTemplate).toBe('test://{message}');
    expect(typeof definition.handler).toBe('function');
  });

  it('should accept optional annotations', () => {
    const annotations: ResourceAnnotations = {
      audience: ['user', 'assistant'],
      priority: 0.5,
      lastModified: '2026-01-01T00:00:00Z',
    };

    expect(annotations.audience).toContain('user');
    expect(annotations.priority).toBe(0.5);
  });
});

describe('resource() builder', () => {
  it('creates a resource definition with URI template extracted', () => {
    const def = resource('items://{id}', {
      description: 'Get item',
      handler: () => ({ ok: true }),
    });

    expect(def.uriTemplate).toBe('items://{id}');
    expect(def.description).toBe('Get item');
    expect(typeof def.handler).toBe('function');
  });

  it('creates a resource definition with params and output schemas', () => {
    const def = resource('items://{id}', {
      description: 'Get item',
      params: z.object({ id: z.string().describe('Item ID') }),
      output: z.object({ name: z.string().describe('Item name') }),
      handler: (params) => ({ name: `Item ${params.id}` }),
    });

    expect(def.params).toBeDefined();
    expect(def.output).toBeDefined();
    const parsed = def.params!.parse({ id: '42' });
    expect(parsed.id).toBe('42');
  });

  it('supports auth, format, and list', () => {
    const def = resource('items://{id}', {
      description: 'Get item',
      auth: ['item:read'],
      handler: () => ({ ok: true }),
      format: (_result, meta) => [{ uri: meta.uri.href, text: 'custom', mimeType: meta.mimeType }],
      list: () => ({ resources: [{ uri: 'items://1', name: 'Item 1' }] }),
    });

    expect(def.auth).toEqual(['item:read']);
    expect(def.format).toBeDefined();
    expect(def.list).toBeDefined();
  });

  it('preserves mimeType', () => {
    const def = resource('docs://{docId}', {
      description: 'Get document',
      mimeType: 'text/markdown',
      handler: () => ({ content: '# Hello' }),
    });

    expect(def.mimeType).toBe('text/markdown');
  });

  it('preserves name override', () => {
    const def = resource('items://{id}', {
      description: 'Get item',
      name: 'custom_resource_name',
      handler: () => ({ ok: true }),
    });

    expect(def.name).toBe('custom_resource_name');
  });

  it('preserves title', () => {
    const def = resource('items://{id}', {
      description: 'Get item',
      title: 'Item Lookup',
      handler: () => ({ ok: true }),
    });

    expect(def.title).toBe('Item Lookup');
  });

  it('preserves examples', () => {
    const def = resource('items://{id}', {
      description: 'Get item',
      examples: [
        { name: 'First item', uri: 'items://1' },
        { name: 'Second item', uri: 'items://2' },
      ],
      handler: () => ({ ok: true }),
    });

    expect(def.examples).toHaveLength(2);
    expect(def.examples![0]!.uri).toBe('items://1');
  });

  it('preserves annotations', () => {
    const def = resource('items://{id}', {
      description: 'Get item',
      annotations: {
        audience: ['user'],
        priority: 0.8,
        lastModified: '2026-03-14T00:00:00Z',
      },
      handler: () => ({ ok: true }),
    });

    expect(def.annotations?.audience).toEqual(['user']);
    expect(def.annotations?.priority).toBe(0.8);
  });

  it('supports async handler', async () => {
    const def = resource('items://{id}', {
      description: 'Get item',
      params: z.object({ id: z.string().describe('Item ID') }),
      handler: async (params) => {
        await Promise.resolve();
        return { id: params.id, name: 'Widget' };
      },
    });

    const result = await def.handler({ id: '42' }, {} as any);
    expect(result).toEqual({ id: '42', name: 'Widget' });
  });

  it('format function receives uri and mimeType', () => {
    const def = resource('items://{id}', {
      description: 'Get item',
      mimeType: 'application/json',
      handler: () => ({ ok: true }),
      format: (result, meta) => [
        { uri: meta.uri.href, text: JSON.stringify(result), mimeType: meta.mimeType },
      ],
    });

    const uri = new URL('items://42');
    const contents = def.format!({ ok: true }, { uri, mimeType: 'application/json' });
    expect(contents).toHaveLength(1);
    expect(contents[0]!.uri).toBe('items://42');
    expect(contents[0]!.mimeType).toBe('application/json');
  });

  it('list function returns resources', async () => {
    const def = resource('items://{id}', {
      description: 'Get item',
      handler: () => ({ ok: true }),
      list: async () => ({
        resources: [
          { uri: 'items://1', name: 'Item 1' },
          { uri: 'items://2', name: 'Item 2' },
        ],
      }),
    });

    const listing = await def.list!({} as any);
    expect(listing.resources).toHaveLength(2);
    expect(listing.resources[0]!.name).toBe('Item 1');
  });
});
