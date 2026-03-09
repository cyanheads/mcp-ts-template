/**
 * @fileoverview Type-satisfaction tests for resource definition interfaces.
 * Verifies that ResourceDefinition and ResourceAnnotations are well-formed
 * and usable as type constraints at runtime.
 * @module tests/mcp-server/resources/utils/resourceDefinition.test
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type {
  ResourceAnnotations,
  ResourceDefinition,
} from '@/mcp-server/resources/utils/resourceDefinition.js';

describe('ResourceDefinition', () => {
  it('should be satisfiable with a minimal valid shape', () => {
    const paramsSchema = z.object({ message: z.string().describe('A message') });

    const definition: ResourceDefinition<typeof paramsSchema> = {
      name: 'test-resource',
      description: 'A test resource',
      uriTemplate: 'test://{message}',
      paramsSchema,
      logic: (_uri, params) => ({ echo: params.message }),
    };

    expect(definition.name).toBe('test-resource');
    expect(definition.uriTemplate).toBe('test://{message}');
    expect(definition.paramsSchema).toBe(paramsSchema);
    expect(typeof definition.logic).toBe('function');
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
