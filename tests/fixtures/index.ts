/**
 * @fileoverview Shared test fixtures and factory functions.
 * Consolidates common test setup patterns used across the suite.
 * @module tests/fixtures
 */
import { vi } from 'vitest';

import { requestContextService, type RequestContext } from '@/utils/index.js';
import type { SdkContext } from '@/mcp-server/tools/utils/toolDefinition.js';

/**
 * Create a test RequestContext with sensible defaults.
 * Wraps `requestContextService.createRequestContext` with common test values.
 */
export function createTestAppContext(
  overrides: Partial<RequestContext> & Record<string, unknown> = {},
): RequestContext {
  return requestContextService.createRequestContext({
    operation: 'test-operation',
    tenantId: 'test-tenant',
    ...overrides,
  });
}

/**
 * Create a mock SdkContext for tool logic tests.
 */
export function createTestSdkContext(
  overrides: Partial<SdkContext> = {},
): SdkContext {
  return {
    signal: new AbortController().signal,
    requestId: 'test-request-id',
    sendNotification: vi.fn().mockResolvedValue(undefined),
    sendRequest: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as SdkContext;
}
