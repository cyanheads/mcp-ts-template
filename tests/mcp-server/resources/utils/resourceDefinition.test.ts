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
});
