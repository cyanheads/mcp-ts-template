/**
 * @fileoverview Tests for the template-echo-message tool (new-style API).
 * @module tests/mcp-server/tools/definitions/template-echo-message.tool.test
 */
import { describe, expect, it } from 'vitest';
import { createMockContext } from '@/testing/index.js';
import {
  echoTool,
  TEST_ERROR_TRIGGER_MESSAGE,
} from '../../../../src/mcp-server/tools/definitions/template-echo-message.tool.js';
import { JsonRpcErrorCode, McpError } from '../../../../src/types-global/errors.js';

describe('echoTool', () => {
  it('should echo a message with default settings', async () => {
    const ctx = createMockContext();
    const rawInput = { message: 'hello' };
    const parsedInput = echoTool.input.parse(rawInput);
    const result = await echoTool.handler(parsedInput, ctx);

    expect(result.originalMessage).toBe('hello');
    expect(result.formattedMessage).toBe('hello');
    expect(result.repeatedMessage).toBe('hello');
    expect(result.mode).toBe('standard');
    expect(result.repeatCount).toBe(1);
    expect(result.timestamp).toBeUndefined();
  });

  it('should echo an uppercase message and repeat it', async () => {
    const ctx = createMockContext();
    const rawInput = {
      message: 'hello',
      mode: 'uppercase',
      repeat: 2,
      includeTimestamp: true,
    };
    const parsedInput = echoTool.input.parse(rawInput);
    const result = await echoTool.handler(parsedInput, ctx);

    expect(result.formattedMessage).toBe('HELLO');
    expect(result.repeatedMessage).toBe('HELLO HELLO');
    expect(result.repeatCount).toBe(2);
    expect(result.timestamp).toBeDefined();
  });

  it('should throw an McpError when the trigger message is used', async () => {
    const ctx = createMockContext();
    const rawInput = { message: TEST_ERROR_TRIGGER_MESSAGE };
    const parsedInput = echoTool.input.parse(rawInput);

    expect(() => echoTool.handler(parsedInput, ctx)).toThrow(McpError);
    expect(() => echoTool.handler(parsedInput, ctx)).toThrow(
      expect.objectContaining({ code: JsonRpcErrorCode.ValidationError }),
    );
  });

  it('should include traceId metadata when provided in context', async () => {
    const ctx = createMockContext({ requestId: 'req-123' });
    // Manually set traceId on the context (it's readonly but we're testing)
    const ctxWithTrace = { ...ctx, traceId: 'trace-echo-123' };

    const rawInput = { message: TEST_ERROR_TRIGGER_MESSAGE };
    const parsedInput = echoTool.input.parse(rawInput);

    let thrown: unknown;
    try {
      await echoTool.handler(parsedInput, ctxWithTrace);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(McpError);
    const mcpError = thrown as McpError;
    expect(mcpError.code).toBe(JsonRpcErrorCode.ValidationError);
    expect(mcpError.data).toMatchObject({
      requestId: 'req-123',
      traceId: 'trace-echo-123',
    });
  });

  it('should format response content with truncation and timestamp', () => {
    const longMessage = 'loremipsum'.repeat(25);
    const formatter = echoTool.format;
    expect(formatter).toBeDefined();

    const result = formatter?.({
      originalMessage: longMessage,
      formattedMessage: longMessage,
      repeatedMessage: `${longMessage} ${longMessage}`,
      mode: 'standard',
      repeatCount: 2,
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    expect(result).toHaveLength(1);
    const block = result![0];
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
    const formatter = echoTool.format;
    expect(formatter).toBeDefined();

    const result = formatter?.({
      originalMessage: 'short',
      formattedMessage: 'short',
      repeatedMessage: 'short',
      mode: 'lowercase',
      repeatCount: 1,
    });

    expect(result).toHaveLength(1);
    const block = result![0];
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
