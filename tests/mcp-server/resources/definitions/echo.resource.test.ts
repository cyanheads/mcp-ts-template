/**
 * @fileoverview Tests for the echo resource definition (new-style resource() builder).
 * @module tests/mcp-server/resources/definitions/echo.resource.test
 */
import { describe, expect, it } from 'vitest';
import { createMockContext } from '@/testing/index.js';
import { echoResourceDefinition } from '../../../../src/mcp-server/resources/definitions/echo.resource.js';

describe('echoResourceDefinition', () => {
  it('should have the correct name, title, and description', () => {
    expect(echoResourceDefinition.name).toBe('echo-resource');
    expect(echoResourceDefinition.title).toBe('Echo Message Resource');
    expect(echoResourceDefinition.description).toBe(
      'A simple echo resource that returns a message.',
    );
  });

  it('should process a basic echo request', async () => {
    const uri = new URL('echo://test-message');
    const ctx = createMockContext({ uri });
    const input = echoResourceDefinition.params!.parse({ message: 'test-message' });
    const result = (await echoResourceDefinition.handler(input, ctx)) as {
      message: string;
      requestUri: string;
      timestamp: string;
    };

    expect(result.message).toBe('test-message');
    expect(result.requestUri).toBe('echo://test-message');
    expect(result).toHaveProperty('timestamp');
  });

  it('should provide resource list for discovery', async () => {
    const mockExtra = {
      signal: new AbortController().signal,
      _meta: {},
    } as any;

    const resourceList = await echoResourceDefinition.list?.(mockExtra);
    expect(resourceList!.resources).toHaveLength(1);
    expect(resourceList!.resources[0]).toHaveProperty('uri', 'echo://hello');
    expect(resourceList!.resources[0]).toHaveProperty('name');
    expect(resourceList!.resources[0]).toHaveProperty('description');
  });
});
