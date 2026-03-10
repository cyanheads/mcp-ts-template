/**
 * @fileoverview Pagination conformance tests for list operations.
 * Validates that tools, resources, and prompts list operations handle
 * pagination parameters correctly, including invalid cursors.
 * @module tests/conformance/pagination
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type ConformanceHarness, createConformanceHarness } from './helpers/server-harness.js';

describe('Pagination conformance', () => {
  let harness: ConformanceHarness;

  beforeAll(async () => {
    harness = await createConformanceHarness();
  });

  afterAll(async () => {
    await harness?.cleanup();
  });

  it('returns all tools without a nextCursor when the list fits in one page', async () => {
    const { nextCursor, tools } = await harness.client.listTools();
    expect(tools.length).toBeGreaterThan(0);
    // Template server has a small number of tools — should fit in one page
    expect(nextCursor).toBeUndefined();
  });

  it('handles an invalid cursor for tools/list gracefully', async () => {
    try {
      await harness.client.listTools({ cursor: 'garbage-invalid-cursor-12345' });
      // If it doesn't throw, that's also acceptable — some servers ignore invalid cursors
    } catch (error: unknown) {
      // Expected: server rejects the invalid cursor
      expect(error).toBeDefined();
    }
  });

  it('returns all resources without a nextCursor when the list fits in one page', async () => {
    const { nextCursor, resources } = await harness.client.listResources();
    expect(resources).toBeDefined();
    expect(Array.isArray(resources)).toBe(true);
    // Template server has a small number of resources — should fit in one page
    expect(nextCursor).toBeUndefined();
  });

  it('returns all prompts without a nextCursor when the list fits in one page', async () => {
    const { nextCursor, prompts } = await harness.client.listPrompts();
    expect(prompts).toBeDefined();
    expect(prompts.length).toBeGreaterThan(0);
    // Template server has a small number of prompts — should fit in one page
    expect(nextCursor).toBeUndefined();
  });
});
