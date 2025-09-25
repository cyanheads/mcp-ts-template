/**
 * @fileoverview Tests for the echo resource definition.
 * @module tests/mcp-server/resources/definitions/echo.resource.test
 */
import { describe, it, expect } from 'vitest';

import { echoResourceDefinition } from '../../../../src/mcp-server/resources/definitions/echo.resource.js';
import { requestContextService } from '../../../../src/utils/index.js';

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

    expect(result.message).toBe('test-message');
    expect(result.requestUri).toBe('echo://test-message');
    expect(result).toHaveProperty('timestamp');
  });
});
