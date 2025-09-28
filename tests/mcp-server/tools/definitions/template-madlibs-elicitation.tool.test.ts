/**
 * @fileoverview Tests for the template-madlibs-elicitation tool.
 * @module tests/mcp-server/tools/definitions/template-madlibs-elicitation.tool.test
 */
import { describe, it, expect, vi } from 'vitest';

import { madlibsElicitationTool } from '../../../../src/mcp-server/tools/definitions/template-madlibs-elicitation.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import {
  McpError,
  JsonRpcErrorCode,
} from '../../../../src/types-global/errors.js';

describe('madlibsElicitationTool', () => {
  const mockSdkContext = {
    signal: new AbortController().signal,
    requestId: 'test-request-id',
    sendNotification: vi.fn(),
    sendRequest: vi.fn(),
  };

  it('should generate a story when all inputs are provided', async () => {
    const appContext = requestContextService.createRequestContext();
    const rawInput = {
      noun: 'cat',
      verb: 'jumped',
      adjective: 'happy',
    };
    const parsedInput = madlibsElicitationTool.inputSchema.parse(rawInput);
    const result = await madlibsElicitationTool.logic(
      parsedInput,
      appContext,
      mockSdkContext,
    );

    expect(result.story).toBe('The happy cat jumped over the lazy dog.');
    expect(result.noun).toBe('cat');
    expect(result.verb).toBe('jumped');
    expect(result.adjective).toBe('happy');
  });

  it('should elicit a noun if it is missing', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue('robot');
    const sdkContextWithElicit = {
      ...mockSdkContext,
      elicitInput: mockElicitInput,
    };
    const appContext = requestContextService.createRequestContext();
    const rawInput = { verb: 'danced', adjective: 'silly' };
    const parsedInput = madlibsElicitationTool.inputSchema.parse(rawInput);
    const result = await madlibsElicitationTool.logic(
      parsedInput,
      appContext,
      sdkContextWithElicit,
    );

    expect(mockElicitInput).toHaveBeenCalledWith({
      message: 'I need a noun.',
      schema: { type: 'string' },
    });
    expect(result.story).toBe('The silly robot danced over the lazy dog.');
    expect(result.noun).toBe('robot');
  });

  it('should elicit all parts of speech if none are provided', async () => {
    const mockElicitInput = vi
      .fn()
      .mockResolvedValueOnce('unicorn') // noun
      .mockResolvedValueOnce('flew') // verb
      .mockResolvedValueOnce('sparkly'); // adjective

    const sdkContextWithElicit = {
      ...mockSdkContext,
      elicitInput: mockElicitInput,
    };
    const appContext = requestContextService.createRequestContext();
    const rawInput = {};
    const parsedInput = madlibsElicitationTool.inputSchema.parse(rawInput);
    const result = await madlibsElicitationTool.logic(
      parsedInput,
      appContext,
      sdkContextWithElicit,
    );

    expect(mockElicitInput).toHaveBeenCalledTimes(3);
    expect(result.story).toBe('The sparkly unicorn flew over the lazy dog.');
    expect(result.noun).toBe('unicorn');
    expect(result.verb).toBe('flew');
    expect(result.adjective).toBe('sparkly');
  });

  it('should throw an error if elicitation is not supported', async () => {
    const appContext = requestContextService.createRequestContext();
    const rawInput = {};
    const parsedInput = madlibsElicitationTool.inputSchema.parse(rawInput);
    // Use the original mockSdkContext which does *not* have elicitInput
    const promise = madlibsElicitationTool.logic(
      parsedInput,
      appContext,
      mockSdkContext,
    );

    await expect(promise).rejects.toThrow(McpError);
    await expect(promise).rejects.toHaveProperty(
      'code',
      JsonRpcErrorCode.InvalidRequest,
    );
  });

  it('should throw an error if elicited input is invalid', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(''); // Empty string
    const sdkContextWithElicit = {
      ...mockSdkContext,
      elicitInput: mockElicitInput,
    };
    const appContext = requestContextService.createRequestContext();
    const rawInput = {};
    const parsedInput = madlibsElicitationTool.inputSchema.parse(rawInput);
    const promise = madlibsElicitationTool.logic(
      parsedInput,
      appContext,
      sdkContextWithElicit,
    );

    await expect(promise).rejects.toThrow(McpError);
    await expect(promise).rejects.toHaveProperty(
      'code',
      JsonRpcErrorCode.InvalidParams,
    );
  });
});
