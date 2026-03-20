/**
 * @fileoverview Shared test fixtures and factory functions.
 * Consolidates common test setup patterns used across the suite.
 * @module tests/fixtures
 */
import type { DefinitionCounts } from '@/mcp-server/transports/http/httpTypes.js';
import { type RequestContext, requestContextService } from '@/utils/internal/requestContext.js';

/** Default definition counts for tests that need a {@link DefinitionCounts} value. */
export const defaultDefinitionCounts: DefinitionCounts = {
  prompts: 1,
  resources: 1,
  tools: 1,
};

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
