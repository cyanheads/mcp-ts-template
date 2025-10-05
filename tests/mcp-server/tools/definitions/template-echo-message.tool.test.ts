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

  it('should include traceId metadata when provided in the request context', async () => {
    const context = requestContextService.createRequestContext({
      traceId: 'trace-echo-123',
    });
    const rawInput = { message: TEST_ERROR_TRIGGER_MESSAGE };
    const parsedInput = echoTool.inputSchema.parse(rawInput);

    let thrown: unknown;
    try {
      await echoTool.logic(parsedInput, context, mockSdkContext);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(McpError);
    const mcpError = thrown as McpError;
    expect(mcpError.code).toBe(JsonRpcErrorCode.ValidationError);
    expect(context.traceId).toBe('trace-echo-123');
    expect(mcpError.data).toMatchObject({
      requestId: context.requestId,
      traceId: 'trace-echo-123',
    });
  });

  it('should format response content with truncation and timestamp', () => {
    const longMessage = 'loremipsum'.repeat(25);
    const formatter = echoTool.responseFormatter;
    expect(formatter).toBeDefined();

    const result = formatter!({
      originalMessage: longMessage,
      formattedMessage: longMessage,
      repeatedMessage: `${longMessage} ${longMessage}`,
      mode: 'standard',
      repeatCount: 2,
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    expect(result).toHaveLength(1);
    const block = result[0];
    expect(block).toBeDefined();
    if (!block || block.type !== 'text') {
      throw new Error('Expected text content block');
    }
    const lines = block.text.split('\n');
    expect(lines[0]).toBe('Echo (mode=standard, repeat=2)');
    expect(lines[1]).toMatch(/…$/);
    expect(lines[2]).toBe('timestamp=2024-01-01T00:00:00.000Z');
  });

  it('should format response content without timestamp when not provided', () => {
    const formatter = echoTool.responseFormatter;
    expect(formatter).toBeDefined();

    const result = formatter!({
      originalMessage: 'short',
      formattedMessage: 'short',
      repeatedMessage: 'short',
      mode: 'lowercase',
      repeatCount: 1,
    });

    expect(result).toHaveLength(1);
    const block = result[0];
    expect(block).toBeDefined();
    if (!block || block.type !== 'text') {
      throw new Error('Expected text content block');
    }
    const lines = block.text.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('Echo (mode=lowercase, repeat=1)');
    expect(lines[1]).toBe('short');
  });
});
