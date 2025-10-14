/**
 * @fileoverview Tests for the echo resource definition.
 * @module tests/mcp-server/resources/definitions/echo.resource.test
 */
import { describe, it, expect } from 'vitest';

import { echoResourceDefinition } from '../../../../src/mcp-server/resources/definitions/echo.resource.js';
import { requestContextService } from '../../../../src/utils/index.js';
import { z } from 'zod';

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
    const rawParams = { message: 'test-message' };
    const parsedParams = echoResourceDefinition.paramsSchema.parse(rawParams);
    const context = requestContextService.createRequestContext();
    const result = await echoResourceDefinition.logic(
      uri,
      parsedParams,
      context,
    );

    if (!echoResourceDefinition.outputSchema) {
      throw new Error('Output schema is not defined');
    }

    const typedResult = result as z.infer<
      typeof echoResourceDefinition.outputSchema
    >;

    expect(typedResult.message).toBe('test-message');
    expect(typedResult.requestUri).toBe('echo://test-message');
    expect(typedResult).toHaveProperty('timestamp');
  });

  it('should provide resource list for discovery', async () => {
    const list = echoResourceDefinition.list;
    expect(list).toBeDefined();

    // Mock RequestHandlerExtra parameter
    const mockExtra = {
      signal: new AbortController().signal,
      _meta: {},
    } as any;

    const resourceList = await list!(mockExtra);
    expect(resourceList.resources).toHaveLength(1);
    expect(resourceList.resources[0]).toHaveProperty('uri', 'echo://hello');
    expect(resourceList.resources[0]).toHaveProperty('name');
    expect(resourceList.resources[0]).toHaveProperty('description');
  });
});
