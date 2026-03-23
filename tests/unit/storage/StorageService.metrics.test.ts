/**
 * @fileoverview Tests for StorageService OTel metrics recording.
 * Verifies that `withStorageOp` records the correct counters, histograms,
 * and error metrics across get, set, delete, list, and batch operations.
 * @module tests/unit/storage/StorageService.metrics.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCounterAdd = vi.fn();
const mockHistogramRecord = vi.fn();
const mockErrorAdd = vi.fn();

vi.mock('@/utils/telemetry/metrics.js', () => ({
  createCounter: vi.fn((name: string) =>
    name.includes('errors') ? { add: mockErrorAdd } : { add: mockCounterAdd },
  ),
  createHistogram: vi.fn(() => ({ record: mockHistogramRecord })),
}));

vi.mock('@/utils/telemetry/trace.js', () => ({
  withSpan: vi.fn(async (_name: string, fn: (span: any) => Promise<any>) =>
    fn({ setAttribute: vi.fn(), setAttributes: vi.fn() }),
  ),
}));

vi.mock('@/utils/internal/performance.js', () => ({
  nowMs: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(150),
}));

vi.mock('@/utils/internal/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

import type { IStorageProvider } from '@/storage/core/IStorageProvider.js';
import { StorageService } from '@/storage/core/StorageService.js';
import { nowMs } from '@/utils/internal/performance.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';

function createMockProvider(overrides: Partial<IStorageProvider> = {}): IStorageProvider {
  return {
    get: vi.fn().mockResolvedValue({ data: 'value' }),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    list: vi.fn().mockResolvedValue({ items: [], cursor: undefined }),
    getMany: vi.fn().mockResolvedValue(new Map()),
    setMany: vi.fn().mockResolvedValue(undefined),
    deleteMany: vi.fn().mockResolvedValue(0),
    clear: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

const ctx: RequestContext = {
  requestId: 'r1',
  timestamp: new Date().toISOString(),
  operation: 'test',
  tenantId: 'test-tenant',
};

describe('StorageService metrics', () => {
  beforeEach(() => {
    mockCounterAdd.mockClear();
    mockHistogramRecord.mockClear();
    mockErrorAdd.mockClear();
    vi.mocked(nowMs).mockReset().mockReturnValueOnce(100).mockReturnValueOnce(150);
  });

  describe('get – success', () => {
    it('records counter and duration with operation=get', async () => {
      const service = new StorageService(createMockProvider());

      await service.get('key1', ctx);

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'mcp.storage.operation': 'get',
        'mcp.storage.success': true,
      });
      expect(mockHistogramRecord).toHaveBeenCalledWith(50, {
        'mcp.storage.operation': 'get',
        'mcp.storage.success': true,
      });
      expect(mockErrorAdd).not.toHaveBeenCalled();
    });
  });

  describe('get – error', () => {
    it('records error counter when provider throws', async () => {
      const provider = createMockProvider({
        get: vi.fn().mockRejectedValue(new Error('DB timeout')),
      });
      const service = new StorageService(provider);

      await expect(service.get('key1', ctx)).rejects.toThrow('DB timeout');

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'mcp.storage.operation': 'get',
        'mcp.storage.success': false,
      });
      expect(mockErrorAdd).toHaveBeenCalledWith(1, {
        'mcp.storage.operation': 'get',
      });
    });
  });

  describe('set – success', () => {
    it('records counter and duration with operation=set', async () => {
      const service = new StorageService(createMockProvider());

      await service.set('key1', { data: 'value' }, ctx);

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'mcp.storage.operation': 'set',
        'mcp.storage.success': true,
      });
      expect(mockHistogramRecord).toHaveBeenCalledWith(50, {
        'mcp.storage.operation': 'set',
        'mcp.storage.success': true,
      });
    });
  });

  describe('delete – success', () => {
    it('records counter and duration with operation=delete', async () => {
      const service = new StorageService(createMockProvider());

      await service.delete('key1', ctx);

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'mcp.storage.operation': 'delete',
        'mcp.storage.success': true,
      });
    });
  });

  describe('list – success', () => {
    it('records counter and duration with operation=list', async () => {
      const service = new StorageService(createMockProvider());

      await service.list('prefix/', ctx);

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'mcp.storage.operation': 'list',
        'mcp.storage.success': true,
      });
    });
  });

  describe('getMany – success', () => {
    it('records counter with operation=getMany', async () => {
      const service = new StorageService(createMockProvider());

      await service.getMany(['k1', 'k2'], ctx);

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'mcp.storage.operation': 'getMany',
        'mcp.storage.success': true,
      });
    });
  });

  describe('deleteMany – error', () => {
    it('records error counter when provider throws', async () => {
      const provider = createMockProvider({
        deleteMany: vi.fn().mockRejectedValue(new Error('Batch fail')),
      });
      const service = new StorageService(provider);

      await expect(service.deleteMany(['k1', 'k2'], ctx)).rejects.toThrow('Batch fail');

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'mcp.storage.operation': 'deleteMany',
        'mcp.storage.success': false,
      });
      expect(mockErrorAdd).toHaveBeenCalledWith(1, {
        'mcp.storage.operation': 'deleteMany',
      });
    });
  });

  describe('clear – success', () => {
    it('records counter with operation=clear', async () => {
      const service = new StorageService(createMockProvider());

      await service.clear(ctx);

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'mcp.storage.operation': 'clear',
        'mcp.storage.success': true,
      });
    });
  });
});
