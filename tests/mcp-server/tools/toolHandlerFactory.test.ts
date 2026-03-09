/**
 * @fileoverview Tests for the tool handler factory end-to-end execution.
 * Verifies that `createMcpToolHandler` correctly orchestrates context creation,
 * input validation, logic execution, response formatting, and error handling.
 * @module tests/mcp-server/tools/toolHandlerFactory.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

// ---------------------------------------------------------------------------
// Module mocks — must precede the import of the module under test
// ---------------------------------------------------------------------------

vi.mock('@/config/index.js', () => ({
  config: { environment: 'testing', mcpServerVersion: '1.0.0-test' },
}));

vi.mock('@/utils/internal/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    notice: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    crit: vi.fn(),
    emerg: vi.fn(),
    child: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock('@/utils/internal/requestContext.js', () => ({
  requestContextService: {
    createRequestContext: vi.fn(() => ({
      requestId: 'test-req-id',
      timestamp: new Date().toISOString(),
    })),
  },
}));

vi.mock('@/utils/internal/performance.js', () => ({
  measureToolExecution: vi.fn((fn: () => unknown) => fn()),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks are declared)
// ---------------------------------------------------------------------------

import { createMcpToolHandler } from '@/mcp-server/tools/utils/toolHandlerFactory.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const TestInput = z.object({
  message: z.string().describe('The message to echo'),
});

type TestOutput = { echo: string };

const mockCallContext = {
  signal: new AbortController().signal,
  sendNotification: vi.fn(),
  sendRequest: vi.fn(),
};

describe('createMcpToolHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns formatted output on valid input', async () => {
    const logic = vi.fn(async (input: z.infer<typeof TestInput>) => ({
      echo: input.message,
    }));

    const handler = createMcpToolHandler<typeof TestInput, TestOutput>({
      toolName: 'test_echo',
      inputSchema: TestInput,
      logic,
    });

    const result = await handler({ message: 'hello' }, mockCallContext as any);

    // structuredContent carries the raw result
    expect(result.structuredContent).toEqual({ echo: 'hello' });

    // Default formatter JSON-stringifies the result
    expect(result.content).toHaveLength(1);
    const block = result.content![0];
    expect(block).toMatchObject({ type: 'text' });
    expect(JSON.parse((block as { text: string }).text)).toEqual({ echo: 'hello' });

    // Not an error
    expect(result.isError).toBeUndefined();

    // Logic was called exactly once
    expect(logic).toHaveBeenCalledOnce();
  });

  it('applies a custom responseFormatter', async () => {
    const logic = vi.fn(async () => ({ echo: 'world' }));
    const formatter = vi.fn((result: TestOutput) => [
      { type: 'text' as const, text: `Custom: ${result.echo}` },
    ]);

    const handler = createMcpToolHandler<typeof TestInput, TestOutput>({
      toolName: 'test_echo',
      inputSchema: TestInput,
      logic,
      responseFormatter: formatter,
    });

    const result = await handler({ message: 'world' }, mockCallContext as any);

    expect(formatter).toHaveBeenCalledWith({ echo: 'world' });
    expect(result.content).toEqual([{ type: 'text', text: 'Custom: world' }]);
    expect(result.structuredContent).toEqual({ echo: 'world' });
  });

  it('propagates McpError from logic as isError response', async () => {
    const logic = vi.fn(async () => {
      throw new McpError(JsonRpcErrorCode.ValidationError, 'bad input');
    });

    const handler = createMcpToolHandler<typeof TestInput, TestOutput>({
      toolName: 'test_echo',
      inputSchema: TestInput,
      logic,
    });

    const result = await handler({ message: 'fail' }, mockCallContext as any);

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const text = (result.content![0] as { text: string }).text;
    expect(text).toContain('bad input');
  });

  it('normalizes unknown errors to isError response', async () => {
    const logic = vi.fn(async () => {
      throw new Error('unexpected');
    });

    const handler = createMcpToolHandler<typeof TestInput, TestOutput>({
      toolName: 'test_echo',
      inputSchema: TestInput,
      logic,
    });

    const result = await handler({ message: 'boom' }, mockCallContext as any);

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const text = (result.content![0] as { text: string }).text;
    // ErrorHandler wraps as "Error in tool:test_echo: unexpected"
    expect(text).toContain('unexpected');
  });

  it('returns isError when input fails schema validation', async () => {
    const logic = vi.fn(async (input: z.infer<typeof TestInput>) => ({
      echo: input.message,
    }));

    const handler = createMcpToolHandler<typeof TestInput, TestOutput>({
      toolName: 'test_echo',
      inputSchema: TestInput,
      logic,
    });

    // Pass wrong type — message should be a string, not a number
    const result = await handler({ message: 123 } as any, mockCallContext as any);

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    // Logic should never have been called
    expect(logic).not.toHaveBeenCalled();
  });
});
