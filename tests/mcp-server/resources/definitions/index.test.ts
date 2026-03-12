/**
 * @fileoverview Tests for resource definitions barrel export.
 * Validates that all registered resources have required metadata and unique names.
 * @module tests/mcp-server/resources/definitions/index
 */
import { describe, expect, it } from 'vitest';

import { allResourceDefinitions } from '@/mcp-server/resources/definitions/index.js';

describe('Resource Definitions Barrel Export', () => {
  it('should export a non-empty array of resource definitions', () => {
    expect(allResourceDefinitions).toBeInstanceOf(Array);
    expect(allResourceDefinitions.length).toBeGreaterThan(0);
  });

  it('should have unique resource names', () => {
    const names = allResourceDefinitions.map((r) => r.name);
    const uniqueNames = new Set(names);

    expect(uniqueNames.size).toBe(names.length);
  });

  for (const resource of allResourceDefinitions) {
    describe(`Resource: ${resource.name}`, () => {
      it('should have required metadata', () => {
        expect(resource.name).toBeTruthy();
        expect(typeof resource.name).toBe('string');
        expect(resource.description).toBeTruthy();
        expect(typeof resource.description).toBe('string');
        expect(resource.uriTemplate).toBeTruthy();
        expect(typeof resource.uriTemplate).toBe('string');
      });

      it('should have a handler function', () => {
        expect(typeof resource.handler).toBe('function');
      });
    });
  }
});
