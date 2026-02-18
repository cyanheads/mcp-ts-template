/**
 * @fileoverview Protocol-level assertion helpers for conformance tests.
 * @module tests/conformance/helpers/assertions
 */
import { expect } from 'vitest';

/** Valid MCP content block types per the spec. */
const VALID_CONTENT_TYPES = [
  'text',
  'image',
  'audio',
  'resource',
  'resource_link',
] as const;

type ContentBlock = { type: string; [key: string]: unknown };

/**
 * Asserts that a CallToolResult has well-formed content blocks.
 * Validates type field, required sub-fields per type, and optional annotations.
 */
export function assertValidContentBlocks(content: ContentBlock[]): void {
  expect(content).toBeDefined();
  expect(Array.isArray(content)).toBe(true);
  expect(content.length).toBeGreaterThan(0);

  for (const block of content) {
    expect(VALID_CONTENT_TYPES).toContain(block.type);

    switch (block.type) {
      case 'text':
        expect(typeof block.text).toBe('string');
        break;
      case 'image':
        expect(typeof block.data).toBe('string');
        expect(typeof block.mimeType).toBe('string');
        break;
      case 'audio':
        expect(typeof block.data).toBe('string');
        expect(typeof block.mimeType).toBe('string');
        break;
      case 'resource':
        expect(block.resource).toBeDefined();
        expect(typeof (block.resource as Record<string, unknown>).uri).toBe(
          'string',
        );
        break;
      case 'resource_link':
        expect(typeof block.uri).toBe('string');
        expect(typeof block.name).toBe('string');
        break;
    }
  }
}

/**
 * Asserts that a tool listing entry has the required protocol fields.
 */
export function assertValidToolEntry(tool: {
  name: string;
  inputSchema: { type: string };
  description?: string | undefined;
}): void {
  expect(tool.name).toBeTruthy();
  expect(typeof tool.name).toBe('string');
  expect(tool.inputSchema).toBeDefined();
  expect(tool.inputSchema.type).toBe('object');
  // description is optional per spec but our template always provides it
  expect(tool.description).toBeTruthy();
}
