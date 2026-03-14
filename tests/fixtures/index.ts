/**
 * @fileoverview Shared test fixtures and factory functions.
 * Consolidates common test setup patterns used across the suite.
 * @module tests/fixtures
 */
import { type RequestContext, requestContextService } from '@/utils/internal/requestContext.js';

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
