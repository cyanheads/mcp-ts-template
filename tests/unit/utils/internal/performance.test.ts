/**
 * @fileoverview Unit tests for the performance measurement helper.
 * @module tests/utils/internal/performance.test
 */

import { SpanStatusCode, trace } from '@opentelemetry/api';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { JsonRpcErrorCode, McpError } from '../../../../src/types-global/errors.js';
import { logger } from '../../../../src/utils/internal/logger.js';
import {
  measureResourceExecution,
  measureToolExecution,
} from '../../../../src/utils/internal/performance.js';

// Shared OTel metric mocks (hoisted for vi.mock factory)
const { mockCounterAdd, mockErrorCounterAdd, mockHistogramRecord, mockUpDownCounterAdd } =
  vi.hoisted(() => ({
    mockCounterAdd: vi.fn(),
    mockErrorCounterAdd: vi.fn(),
    mockHistogramRecord: vi.fn(),
    mockUpDownCounterAdd: vi.fn(),
  }));

vi.mock('../../../../src/utils/telemetry/metrics.js', () => ({
  createCounter: vi.fn((name: string) => ({
    add: name.endsWith('.errors') ? mockErrorCounterAdd : mockCounterAdd,
  })),
  createHistogram: vi.fn(() => ({ record: mockHistogramRecord })),
  createUpDownCounter: vi.fn(() => ({ add: mockUpDownCounterAdd })),
}));

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
  let tracerSpy: MockInstance;
  let infoSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    tracerSpy = vi.spyOn(trace, 'getTracer').mockReturnValue(tracer as never);
    infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    tracerSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it('records success metrics and returns the tool result', async () => {
    const byteLengthSpy = vi.spyOn(Buffer, 'byteLength');

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

  it('records OTel metric counter and histogram on success', async () => {
    await measureToolExecution(
      async () => ({ message: 'ok' }),
      { toolName: 'metric-tool', requestId: 'req-m1', timestamp: new Date().toISOString() },
      { input: 'v' },
    );

    expect(mockCounterAdd).toHaveBeenCalledWith(1, {
      'mcp.tool.name': 'metric-tool',
      'mcp.tool.success': true,
    });
    expect(mockHistogramRecord).toHaveBeenCalledWith(expect.any(Number), {
      'mcp.tool.name': 'metric-tool',
      'mcp.tool.success': true,
    });
    expect(mockErrorCounterAdd).not.toHaveBeenCalled();
  });

  it('records OTel error counter on failure', async () => {
    await expect(
      measureToolExecution(
        async () => {
          throw new McpError(JsonRpcErrorCode.InternalError, 'fail');
        },
        { toolName: 'err-tool', requestId: 'req-m2', timestamp: new Date().toISOString() },
        {},
      ),
    ).rejects.toThrow();

    expect(mockCounterAdd).toHaveBeenCalledWith(1, {
      'mcp.tool.name': 'err-tool',
      'mcp.tool.success': false,
    });
    expect(mockHistogramRecord).toHaveBeenCalledWith(expect.any(Number), {
      'mcp.tool.name': 'err-tool',
      'mcp.tool.success': false,
    });
    expect(mockErrorCounterAdd).toHaveBeenCalledWith(1, { 'mcp.tool.name': 'err-tool' });
  });

  it('captures error metadata and rethrows the original McpError', async () => {
    const failure = new McpError(JsonRpcErrorCode.InternalError, 'boom');

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
    expect((logMeta as any).metrics.errorCode).toBe(String(JsonRpcErrorCode.InternalError));
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

    expect(span.setAttribute).toHaveBeenCalledWith('mcp.tool.error_code', 'UNHANDLED_ERROR');
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

    mutableGlobal.TextEncoder = FakeTextEncoder as unknown as typeof TextEncoder;

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

describe('measureResourceExecution', () => {
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
  let tracerSpy: MockInstance;
  let infoSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    tracerSpy = vi.spyOn(trace, 'getTracer').mockReturnValue(tracer as never);
    infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    tracerSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it('records success metrics and returns the resource result', async () => {
    const result = await measureResourceExecution(
      async () => ({ data: 'hello' }),
      { resourceName: 'test-resource', requestId: 'req-r1', timestamp: new Date().toISOString() },
      { uri: 'test://items/1', mimeType: 'application/json' },
    );

    expect(result).toEqual({ data: 'hello' });
    expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(span.setAttributes).toHaveBeenLastCalledWith(
      expect.objectContaining({
        'mcp.resource.duration_ms': expect.any(Number),
        'mcp.resource.success': true,
      }),
    );
    expect(span.end).toHaveBeenCalled();
  });

  it('records OTel counter and histogram on success', async () => {
    await measureResourceExecution(
      async () => ({ ok: true }),
      { resourceName: 'metric-resource', requestId: 'req-r2', timestamp: new Date().toISOString() },
      { uri: 'test://items/2', mimeType: 'application/json' },
    );

    expect(mockCounterAdd).toHaveBeenCalledWith(1, {
      'mcp.resource.name': 'metric-resource',
      'mcp.resource.success': true,
    });
    expect(mockHistogramRecord).toHaveBeenCalledWith(expect.any(Number), {
      'mcp.resource.name': 'metric-resource',
      'mcp.resource.success': true,
    });
    expect(mockErrorCounterAdd).not.toHaveBeenCalled();
  });

  it('records output bytes histogram on success', async () => {
    await measureResourceExecution(
      async () => ({ items: [1, 2, 3] }),
      { resourceName: 'bytes-resource', requestId: 'req-r3', timestamp: new Date().toISOString() },
      { uri: 'test://items/3', mimeType: 'application/json' },
    );

    // Output bytes histogram should be recorded (at least one call with resource name attr)
    expect(mockHistogramRecord).toHaveBeenCalledWith(expect.any(Number), {
      'mcp.resource.name': 'bytes-resource',
    });
  });

  it('records OTel error counter on failure', async () => {
    await expect(
      measureResourceExecution(
        async () => {
          throw new McpError(JsonRpcErrorCode.NotFound, 'not found');
        },
        { resourceName: 'err-resource', requestId: 'req-r4', timestamp: new Date().toISOString() },
        { uri: 'test://items/404', mimeType: 'application/json' },
      ),
    ).rejects.toThrow();

    expect(mockCounterAdd).toHaveBeenCalledWith(1, {
      'mcp.resource.name': 'err-resource',
      'mcp.resource.success': false,
    });
    expect(mockHistogramRecord).toHaveBeenCalledWith(expect.any(Number), {
      'mcp.resource.name': 'err-resource',
      'mcp.resource.success': false,
    });
    expect(mockErrorCounterAdd).toHaveBeenCalledWith(1, { 'mcp.resource.name': 'err-resource' });
  });

  it('increments and decrements active requests gauge', async () => {
    await measureResourceExecution(
      async () => 'ok',
      { resourceName: 'gauge-resource', requestId: 'req-r5', timestamp: new Date().toISOString() },
      { uri: 'test://items/5', mimeType: 'text/plain' },
    );

    expect(mockUpDownCounterAdd).toHaveBeenCalledWith(1);
    expect(mockUpDownCounterAdd).toHaveBeenCalledWith(-1);
  });

  it('sets span attributes for URI and MIME type', async () => {
    await measureResourceExecution(
      async () => null,
      { resourceName: 'attr-resource', requestId: 'req-r6', timestamp: new Date().toISOString() },
      { uri: 'myscheme://items/6', mimeType: 'text/html' },
    );

    expect(span.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'mcp.resource.uri': 'myscheme://items/6',
        'mcp.resource.mime_type': 'text/html',
      }),
    );
  });

  it('captures McpError code on failure', async () => {
    const failure = new McpError(JsonRpcErrorCode.NotFound, 'gone');

    await expect(
      measureResourceExecution(
        async () => {
          throw failure;
        },
        { resourceName: 'code-resource', requestId: 'req-r7', timestamp: new Date().toISOString() },
        { uri: 'test://items/7', mimeType: 'application/json' },
      ),
    ).rejects.toBe(failure);

    expect(span.setAttribute).toHaveBeenCalledWith(
      'mcp.resource.error_code',
      String(JsonRpcErrorCode.NotFound),
    );
  });
});
