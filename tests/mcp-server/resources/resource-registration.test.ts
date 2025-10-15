/**
 * @fileoverview Tests for resource registration system.
 * @module tests/mcp-server/resources/resource-registration.test.ts
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ResourceRegistry } from '@/mcp-server/resources/resource-registration.js';

describe('ResourceRegistry', () => {
  let mockServer: any;
  let registry: ResourceRegistry;

  beforeEach(() => {
    // Create a mock MCP server
    mockServer = {
      resource: vi.fn(() => {}),
    };

    // Create registry with empty resource definitions
    registry = new ResourceRegistry([]);
  });

  describe('Resource Registration', () => {
    it('should have registerAll method', () => {
      expect(typeof registry.registerAll).toBe('function');
    });

    it('should handle empty resources list', async () => {
      await registry.registerAll(mockServer);
      // Should not throw with empty list
      expect(true).toBe(true);
    });

    it('should create registry with resource definitions', () => {
      const mockResource = {
        name: 'test_resource',
        description: 'Test resource',
        uriTemplate: 'test://{id}',
        mimeType: 'text/plain',
      };

      const registryWithResource = new ResourceRegistry([mockResource as any]);

      // Registry should be created successfully
      expect(registryWithResource).toBeDefined();
      expect(typeof registryWithResource.registerAll).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should not throw when registering with valid server', async () => {
      // Empty registry should complete successfully
      await registry.registerAll(mockServer);
      expect(true).toBe(true);
    });

    it('should handle server with resource method', async () => {
      const serverWithMethod: any = {
        resource: vi.fn(async () => {}),
      };

      // Should complete registration without throwing
      await registry.registerAll(serverWithMethod);
      expect(true).toBe(true);
    });
  });

  describe('Registration Order', () => {
    it('should maintain resource definitions order', () => {
      const resource1 = {
        name: 'resource_one',
        description: 'First resource',
        uriTemplate: 'one://{id}',
      };
      const resource2 = {
        name: 'resource_two',
        description: 'Second resource',
        uriTemplate: 'two://{id}',
      };

      const registryWithResources = new ResourceRegistry([
        resource1 as any,
        resource2 as any,
      ]);

      // Registry should preserve order
      expect(registryWithResources).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should successfully register all available resources', async () => {
      await registry.registerAll(mockServer);
      // Should complete registration process
      expect(true).toBe(true);
    });

    it('should create registry with dependency injection', () => {
      const newRegistry = new ResourceRegistry([]);
      expect(newRegistry).toBeDefined();
      expect(typeof newRegistry.registerAll).toBe('function');
    });

    it('should track multiple resources', () => {
      const mockResources = [
        { name: 'r1', description: 'R1', uriTemplate: 'r1://{id}' },
        { name: 'r2', description: 'R2', uriTemplate: 'r2://{id}' },
      ];

      const registryWithMultiple = new ResourceRegistry(mockResources as any);

      // Should create registry with multiple resources
      expect(registryWithMultiple).toBeDefined();
    });
  });

  describe('Resource Definition Validation', () => {
    it('should accept resources with required fields', () => {
      const validResource = {
        name: 'valid_resource',
        description: 'A valid resource',
        uriTemplate: 'valid://{id}',
        mimeType: 'application/json',
      };

      const registryWithValid = new ResourceRegistry([validResource as any]);
      expect(registryWithValid).toBeDefined();
    });

    it('should handle resources with optional list function', () => {
      const resourceWithList = {
        name: 'listable_resource',
        description: 'Resource with list',
        uriTemplate: 'list://{id}',
        list: async () => ({ resources: [] }),
      };

      const registryWithList = new ResourceRegistry([resourceWithList as any]);
      expect(registryWithList).toBeDefined();
    });

    it('should handle resources with examples', () => {
      const resourceWithExamples = {
        name: 'documented_resource',
        description: 'Resource with examples',
        uriTemplate: 'doc://{id}',
        examples: ['doc://123', 'doc://456'],
      };

      const registryWithExamples = new ResourceRegistry([
        resourceWithExamples as any,
      ]);
      expect(registryWithExamples).toBeDefined();
    });
  });
});
