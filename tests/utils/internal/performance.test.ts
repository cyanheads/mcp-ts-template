/**
 * @fileoverview Unit tests for the performance measurement helper.
 * @module tests/utils/internal/performance.test
 */
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { SpanStatusCode, trace } from '@opentelemetry/api';

import {
  JsonRpcErrorCode,
  McpError,
} from '../../../src/types-global/errors.js';
import { measureToolExecution } from '../../../src/utils/internal/performance.js';
import { logger } from '../../../src/utils/internal/logger.js';

describe('measureToolExecution', () => {
  const span = {
    setAttributes: vi.fn(),
    setAttribute: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
  };
  const tracer = {
    startActiveSpan: vi.fn(async (_name, callback) => callback(span as never)),
  };
  const tracerSpy = vi.spyOn(trace, 'getTracer');
  const memoryUsageSpy = vi.spyOn(process, 'memoryUsage');
  let infoSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    tracerSpy.mockReturnValue(tracer as never);
    memoryUsageSpy.mockReset();
    infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  afterAll(() => {
    tracerSpy.mockRestore();
    memoryUsageSpy.mockRestore();
  });

  it('records success metrics and returns the tool result', async () => {
    const byteLengthSpy = vi.spyOn(Buffer, 'byteLength');
    memoryUsageSpy
      .mockReturnValueOnce({ rss: 1000, heapUsed: 400 } as NodeJS.MemoryUsage)
      .mockReturnValueOnce({ rss: 1600, heapUsed: 700 } as NodeJS.MemoryUsage);

    const result = await measureToolExecution(
      async () => ({ message: 'ok' }),
      {
        toolName: 'test-tool',
        requestId: 'req-1',
        timestamp: new Date().toISOString(),
      },
      { input: 'value' },
    );

    expect(result).toEqual({ message: 'ok' });
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const call = infoSpy.mock.calls[0];
    if (!call) throw new Error('infoSpy was not called');
    const [, logMeta] = call;
    expect((logMeta as any).metrics.isSuccess).toBe(true);
    expect((logMeta as any).metrics.errorCode).toBeUndefined();
    expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(span.setAttributes).toHaveBeenLastCalledWith(
      expect.objectContaining({
        'mcp.tool.duration_ms': expect.any(Number),
        'mcp.tool.success': true,
      }),
    );
    expect(span.end).toHaveBeenCalled();
    expect(byteLengthSpy).toHaveBeenCalled();
    byteLengthSpy.mockRestore();
  });

  it('captures error metadata and rethrows the original McpError', async () => {
    const failure = new McpError(JsonRpcErrorCode.InternalError, 'boom');

    memoryUsageSpy
      .mockReturnValueOnce({ rss: 500, heapUsed: 250 } as NodeJS.MemoryUsage)
      .mockReturnValueOnce({ rss: 560, heapUsed: 290 } as NodeJS.MemoryUsage);

    await expect(
      measureToolExecution(
        async () => {
          throw failure;
        },
        {
          toolName: 'failing-tool',
          requestId: 'req-2',
          timestamp: new Date().toISOString(),
        },
        { payload: 'data' },
      ),
    ).rejects.toBe(failure);

    expect(span.recordException).toHaveBeenCalledWith(failure);
    expect(span.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'boom',
    });
    expect(span.setAttribute).toHaveBeenCalledWith(
      'mcp.tool.error_code',
      String(JsonRpcErrorCode.InternalError),
    );
    const call = infoSpy.mock.calls[0];
    if (!call) throw new Error('infoSpy was not called');
    const [, logMeta] = call;
    expect((logMeta as any).metrics.isSuccess).toBe(false);
    expect((logMeta as any).metrics.errorCode).toBe(
      String(JsonRpcErrorCode.InternalError),
    );
  });

  it('handles generic errors and uses JSON length fallback when Buffer is unavailable', async () => {
    const mutableGlobal = globalThis as {
      Buffer?: typeof Buffer;
      TextEncoder?: typeof TextEncoder;
    };
    const originalBuffer = mutableGlobal.Buffer;
    const originalTextEncoder = mutableGlobal.TextEncoder;
    // Simulate an environment without Buffer/TextEncoder support.
    delete mutableGlobal.Buffer;
    delete mutableGlobal.TextEncoder;

    memoryUsageSpy
      .mockReturnValueOnce({ rss: 200, heapUsed: 120 } as NodeJS.MemoryUsage)
      .mockReturnValueOnce({ rss: 220, heapUsed: 140 } as NodeJS.MemoryUsage);

    const failure = new Error('unexpected');
    const payload = { key: 'value' };
    const expectedBytes = JSON.stringify(payload).length;

    try {
      await expect(
        measureToolExecution(
          async () => {
            throw failure;
          },
          {
            toolName: 'generic-failure',
            requestId: 'req-3',
            timestamp: new Date().toISOString(),
          },
          payload,
        ),
      ).rejects.toBe(failure);
    } finally {
      // Restore globals for other tests.
      if (originalBuffer) mutableGlobal.Buffer = originalBuffer;
      else delete mutableGlobal.Buffer;

      if (originalTextEncoder) mutableGlobal.TextEncoder = originalTextEncoder;
      else delete mutableGlobal.TextEncoder;
    }

    expect(span.setAttribute).toHaveBeenCalledWith(
      'mcp.tool.error_code',
      'UNHANDLED_ERROR',
    );
    const call = infoSpy.mock.calls[0];
    if (!call) throw new Error('infoSpy was not called');
    const [, logMeta] = call;
    expect((logMeta as any).metrics.inputBytes).toBe(expectedBytes);
    expect((logMeta as any).metrics.outputBytes).toBe(0);
  });

  it('uses TextEncoder fallback when Buffer is unavailable but TextEncoder exists', async () => {
    const mutableGlobal = globalThis as {
      Buffer?: typeof Buffer;
      TextEncoder?: typeof TextEncoder;
    };
    const originalBuffer = mutableGlobal.Buffer;
    const originalTextEncoder = mutableGlobal.TextEncoder;

    delete mutableGlobal.Buffer;

    const encodeSpy = vi.fn((input: string) => {
      const arr = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i += 1) {
        arr[i] = input.charCodeAt(i);
      }
      return arr;
    });

    class FakeTextEncoder {
      encode(value: string): Uint8Array {
        return encodeSpy(value);
      }
    }

    mutableGlobal.TextEncoder =
      FakeTextEncoder as unknown as typeof TextEncoder;

    memoryUsageSpy
      .mockReturnValueOnce({ rss: 700, heapUsed: 350 } as NodeJS.MemoryUsage)
      .mockReturnValueOnce({ rss: 900, heapUsed: 450 } as NodeJS.MemoryUsage);

    infoSpy.mockRestore();
    const localInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});

    try {
      const result = await measureToolExecution(
        async () => ({ ok: true }),
        {
          toolName: 'text-encoder-fallback',
          requestId: 'req-4',
          timestamp: new Date().toISOString(),
        },
        { input: 'value' },
      );

      expect(result).toEqual({ ok: true });
      expect(encodeSpy).toHaveBeenCalled();
      const call = localInfoSpy.mock.calls[0];
      if (!call) throw new Error('info logger was not called');
      const [, logMeta] = call;
      expect((logMeta as any).metrics.isSuccess).toBe(true);
      expect((logMeta as any).metrics.errorCode).toBeUndefined();
    } finally {
      if (originalBuffer) mutableGlobal.Buffer = originalBuffer;
      else delete mutableGlobal.Buffer;

      if (originalTextEncoder) mutableGlobal.TextEncoder = originalTextEncoder;
      else delete mutableGlobal.TextEncoder;

      localInfoSpy.mockRestore();
      infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    }
  });
});
