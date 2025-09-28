/**
 * @fileoverview Tests for the template-echo-message tool.
 * @module tests/mcp-server/tools/definitions/template-echo-message.tool.test
 */
import { describe, it, expect, vi } from 'vitest';

import {
  echoTool,
  TEST_ERROR_TRIGGER_MESSAGE,
} from '../../../../src/mcp-server/tools/definitions/template-echo-message.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import {
  McpError,
  JsonRpcErrorCode,
} from '../../../../src/types-global/errors.js';

describe('echoTool', () => {
  const mockSdkContext = {
    signal: new AbortController().signal,
    requestId: 'test-request-id',
    sendNotification: vi.fn(),
    sendRequest: vi.fn(),
  };

  it('should echo a message with default settings', async () => {
    const context = requestContextService.createRequestContext();
    const rawInput = { message: 'hello' };
    const parsedInput = echoTool.inputSchema.parse(rawInput);
    const result = await echoTool.logic(parsedInput, context, mockSdkContext);

    expect(result.originalMessage).toBe('hello');
    expect(result.formattedMessage).toBe('hello');
    expect(result.repeatedMessage).toBe('hello');
    expect(result.mode).toBe('standard');
    expect(result.repeatCount).toBe(1);
    expect(result.timestamp).toBeUndefined();
  });

  it('should echo an uppercase message and repeat it', async () => {
    const context = requestContextService.createRequestContext();
    const rawInput = {
      message: 'hello',
      mode: 'uppercase',
      repeat: 2,
      includeTimestamp: true,
    };
    const parsedInput = echoTool.inputSchema.parse(rawInput);
    const result = await echoTool.logic(parsedInput, context, mockSdkContext);

    expect(result.formattedMessage).toBe('HELLO');
    expect(result.repeatedMessage).toBe('HELLO HELLO');
    expect(result.repeatCount).toBe(2);
    expect(result.timestamp).toBeDefined();
  });

  it('should throw an McpError when the trigger message is used', async () => {
    const context = requestContextService.createRequestContext();
    const rawInput = { message: TEST_ERROR_TRIGGER_MESSAGE };
    const parsedInput = echoTool.inputSchema.parse(rawInput);
    const promise = echoTool.logic(parsedInput, context, mockSdkContext);

    await expect(promise).rejects.toThrow(McpError);
    await expect(promise).rejects.toHaveProperty(
      'code',
      JsonRpcErrorCode.ValidationError,
    );
  });
});
