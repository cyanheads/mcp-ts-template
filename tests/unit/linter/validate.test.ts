/**
 * @fileoverview Tests for the MCP definition linter.
 * @module tests/unit/linter/validate.test
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { validateDefinitions } from '@/linter/validate.js';

// ---------------------------------------------------------------------------
// Helpers — minimal valid definitions
// ---------------------------------------------------------------------------

function validTool(overrides: Record<string, unknown> = {}) {
  return {
    name: 'test_tool',
    description: 'A test tool',
    input: z.object({ query: z.string().describe('Search query') }),
    output: z.object({ result: z.string().describe('Result') }),
    handler: async () => ({ result: 'ok' }),
    ...overrides,
  };
}

function validResource(overrides: Record<string, unknown> = {}) {
  return {
    uriTemplate: 'test://{id}/data',
    name: 'test_resource',
    description: 'A test resource',
    handler: async () => ({ data: 'ok' }),
    ...overrides,
  };
}

function validPrompt(overrides: Record<string, unknown> = {}) {
  return {
    name: 'test_prompt',
    description: 'A test prompt',
    generate: () => [{ role: 'user' as const, content: { type: 'text' as const, text: 'hi' } }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateDefinitions', () => {
  describe('valid definitions', () => {
    it('passes with valid tool, resource, and prompt', () => {
      const report = validateDefinitions({
        tools: [validTool()],
        resources: [validResource()],
        prompts: [validPrompt()],
      });

      expect(report.passed).toBe(true);
      expect(report.errors).toHaveLength(0);
    });

    it('passes with empty arrays', () => {
      const report = validateDefinitions({ tools: [], resources: [], prompts: [] });
      expect(report.passed).toBe(true);
    });

    it('passes with undefined arrays', () => {
      const report = validateDefinitions({});
      expect(report.passed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Tool rules
  // -------------------------------------------------------------------------

  describe('tool rules', () => {
    it('errors on empty tool name', () => {
      const report = validateDefinitions({ tools: [validTool({ name: '' })] });
      expect(report.passed).toBe(false);
      expect(report.errors).toContainEqual(
        expect.objectContaining({ rule: 'name-required', definitionType: 'tool' }),
      );
    });

    it('errors on missing tool name', () => {
      const { name: _, ...noName } = validTool();
      const report = validateDefinitions({ tools: [noName] });
      expect(report.passed).toBe(false);
      expect(report.errors).toContainEqual(expect.objectContaining({ rule: 'name-required' }));
    });

    it('errors on invalid tool name format', () => {
      const report = validateDefinitions({ tools: [validTool({ name: 'my tool!' })] });
      expect(report.passed).toBe(false);
      expect(report.errors).toContainEqual(expect.objectContaining({ rule: 'name-format' }));
    });

    it('accepts valid tool name characters', () => {
      const report = validateDefinitions({
        tools: [validTool({ name: 'my_tool.v2-beta' })],
      });
      const nameErrors = report.errors.filter((e) => e.rule === 'name-format');
      expect(nameErrors).toHaveLength(0);
    });

    it('errors on duplicate tool names', () => {
      const report = validateDefinitions({
        tools: [validTool({ name: 'dup' }), validTool({ name: 'dup' })],
      });
      expect(report.errors).toContainEqual(
        expect.objectContaining({ rule: 'name-unique', definitionType: 'tool' }),
      );
    });

    it('warns on missing description', () => {
      const report = validateDefinitions({ tools: [validTool({ description: '' })] });
      expect(report.warnings).toContainEqual(
        expect.objectContaining({ rule: 'description-required', definitionType: 'tool' }),
      );
    });

    it('errors on missing handler', () => {
      const report = validateDefinitions({ tools: [validTool({ handler: undefined })] });
      expect(report.errors).toContainEqual(
        expect.objectContaining({ rule: 'handler-required', definitionType: 'tool' }),
      );
    });

    it('errors on non-ZodObject input', () => {
      const report = validateDefinitions({ tools: [validTool({ input: z.string() })] });
      expect(report.errors).toContainEqual(
        expect.objectContaining({
          rule: 'schema-is-object',
          message: expect.stringContaining('input'),
        }),
      );
    });

    it('errors on non-ZodObject output', () => {
      const report = validateDefinitions({ tools: [validTool({ output: z.array(z.string()) })] });
      expect(report.errors).toContainEqual(
        expect.objectContaining({
          rule: 'schema-is-object',
          message: expect.stringContaining('output'),
        }),
      );
    });

    it('warns on fields missing .describe()', () => {
      const report = validateDefinitions({
        tools: [
          validTool({
            input: z.object({ noDesc: z.string() }),
            output: z.object({ alsoNoDesc: z.number() }),
          }),
        ],
      });
      const descWarnings = report.warnings.filter((w) => w.rule === 'describe-on-fields');
      expect(descWarnings.length).toBeGreaterThanOrEqual(2);
      expect(descWarnings).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('input.noDesc') }),
      );
    });

    it('does not warn on fields with .describe()', () => {
      const report = validateDefinitions({
        tools: [
          validTool({
            input: z.object({ q: z.string().describe('query') }),
            output: z.object({ r: z.string().describe('result') }),
          }),
        ],
      });
      const descWarnings = report.warnings.filter((w) => w.rule === 'describe-on-fields');
      expect(descWarnings).toHaveLength(0);
    });

    it('does not warn on optional fields with .describe()', () => {
      const report = validateDefinitions({
        tools: [
          validTool({
            input: z.object({ q: z.string().optional().describe('query') }),
          }),
        ],
      });
      const descWarnings = report.warnings.filter((w) => w.rule === 'describe-on-fields');
      expect(descWarnings).toHaveLength(0);
    });

    it('warns on non-boolean annotation hints', () => {
      const report = validateDefinitions({
        tools: [validTool({ annotations: { readOnlyHint: 'yes' } })],
      });
      expect(report.warnings).toContainEqual(expect.objectContaining({ rule: 'annotation-type' }));
    });

    it('warns on contradictory annotations (readOnly + destructive)', () => {
      const report = validateDefinitions({
        tools: [validTool({ annotations: { readOnlyHint: true, destructiveHint: true } })],
      });
      expect(report.warnings).toContainEqual(
        expect.objectContaining({
          rule: 'annotation-coherence',
          message: expect.stringContaining('destructiveHint'),
        }),
      );
    });

    it('warns on redundant annotations (readOnly + idempotent)', () => {
      const report = validateDefinitions({
        tools: [validTool({ annotations: { readOnlyHint: true, idempotentHint: true } })],
      });
      expect(report.warnings).toContainEqual(
        expect.objectContaining({
          rule: 'annotation-coherence',
          message: expect.stringContaining('idempotentHint'),
        }),
      );
    });

    it('does not warn on annotations when readOnlyHint is false', () => {
      const report = validateDefinitions({
        tools: [
          validTool({
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
          }),
        ],
      });
      const coherenceWarnings = report.warnings.filter((w) => w.rule === 'annotation-coherence');
      expect(coherenceWarnings).toHaveLength(0);
    });

    it('errors on non-array auth', () => {
      const report = validateDefinitions({ tools: [validTool({ auth: 'scope:read' })] });
      expect(report.errors).toContainEqual(expect.objectContaining({ rule: 'auth-type' }));
    });

    it('errors on empty string in auth scopes', () => {
      const report = validateDefinitions({
        tools: [validTool({ auth: ['tool:read', ''] })],
      });
      expect(report.errors).toContainEqual(expect.objectContaining({ rule: 'auth-scope-format' }));
    });

    it('passes with valid auth scopes', () => {
      const report = validateDefinitions({
        tools: [validTool({ auth: ['tool:my_tool:read', 'admin'] })],
      });
      const authErrors = report.errors.filter(
        (e) => e.rule === 'auth-type' || e.rule === 'auth-scope-format',
      );
      expect(authErrors).toHaveLength(0);
    });

    it('errors on non-serializable input schema (z.custom)', () => {
      const report = validateDefinitions({
        tools: [
          validTool({
            input: z.object({ data: z.custom<unknown>().describe('Opaque data') }),
          }),
        ],
      });
      expect(report.passed).toBe(false);
      expect(report.errors).toContainEqual(
        expect.objectContaining({
          rule: 'schema-serializable',
          message: expect.stringContaining('input'),
        }),
      );
    });

    it('errors on non-serializable output schema (z.custom)', () => {
      const report = validateDefinitions({
        tools: [
          validTool({
            output: z.object({ result: z.custom<unknown>().describe('Opaque result') }),
          }),
        ],
      });
      expect(report.passed).toBe(false);
      expect(report.errors).toContainEqual(
        expect.objectContaining({
          rule: 'schema-serializable',
          message: expect.stringContaining('output'),
        }),
      );
    });

    it('errors on non-serializable schema (z.date)', () => {
      const report = validateDefinitions({
        tools: [
          validTool({
            input: z.object({ when: z.date().describe('Timestamp') }),
          }),
        ],
      });
      expect(report.passed).toBe(false);
      expect(report.errors).toContainEqual(
        expect.objectContaining({ rule: 'schema-serializable' }),
      );
    });

    it('passes with serializable schema types', () => {
      const report = validateDefinitions({
        tools: [
          validTool({
            input: z.object({
              name: z.string().describe('Name'),
              count: z.number().optional().describe('Count'),
              tags: z.array(z.string()).describe('Tags'),
              status: z.enum(['active', 'inactive']).describe('Status'),
            }),
            output: z.object({
              id: z.string().describe('ID'),
              ok: z.boolean().describe('Success'),
            }),
          }),
        ],
      });
      const serialErrors = report.errors.filter((e) => e.rule === 'schema-serializable');
      expect(serialErrors).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Resource rules
  // -------------------------------------------------------------------------

  describe('resource rules', () => {
    it('errors on missing uriTemplate', () => {
      const { uriTemplate: _, ...noUri } = validResource();
      const report = validateDefinitions({ resources: [noUri] });
      expect(report.errors).toContainEqual(
        expect.objectContaining({ rule: 'uri-template-required' }),
      );
    });

    it('errors on invalid URI template (unbalanced braces)', () => {
      const report = validateDefinitions({
        resources: [validResource({ uriTemplate: 'test://{id/data' })],
      });
      expect(report.errors).toContainEqual(expect.objectContaining({ rule: 'uri-template-valid' }));
    });

    it('errors on empty variable name in URI template', () => {
      const report = validateDefinitions({
        resources: [validResource({ uriTemplate: 'test://{}/data' })],
      });
      expect(report.errors).toContainEqual(expect.objectContaining({ rule: 'uri-template-valid' }));
    });

    it('warns when name defaults to URI template', () => {
      const report = validateDefinitions({
        resources: [validResource({ name: undefined })],
      });
      expect(report.warnings).toContainEqual(
        expect.objectContaining({ rule: 'resource-name-not-uri' }),
      );
    });

    it('errors on duplicate resource names', () => {
      const report = validateDefinitions({
        resources: [
          validResource({ name: 'dup', uriTemplate: 'a://{id}' }),
          validResource({ name: 'dup', uriTemplate: 'b://{id}' }),
        ],
      });
      expect(report.errors).toContainEqual(
        expect.objectContaining({ rule: 'name-unique', definitionType: 'resource' }),
      );
    });

    it('errors on missing handler', () => {
      const report = validateDefinitions({
        resources: [validResource({ handler: undefined })],
      });
      expect(report.errors).toContainEqual(
        expect.objectContaining({ rule: 'handler-required', definitionType: 'resource' }),
      );
    });

    it('errors on non-ZodObject params', () => {
      const report = validateDefinitions({
        resources: [validResource({ params: z.string() })],
      });
      expect(report.errors).toContainEqual(
        expect.objectContaining({
          rule: 'schema-is-object',
          message: expect.stringContaining('params'),
        }),
      );
    });

    it('errors when template variables do not match params schema keys', () => {
      const report = validateDefinitions({
        resources: [
          validResource({
            uriTemplate: 'test://{itemId}/data',
            params: z.object({ item_id: z.string().describe('Item ID') }),
          }),
        ],
      });
      expect(report.passed).toBe(false);
      expect(report.errors).toContainEqual(
        expect.objectContaining({
          rule: 'template-params-align',
          message: expect.stringContaining('itemId'),
        }),
      );
    });

    it('passes when template variables match params schema keys', () => {
      const report = validateDefinitions({
        resources: [
          validResource({
            uriTemplate: 'test://{itemId}/data',
            params: z.object({ itemId: z.string().describe('Item ID') }),
          }),
        ],
      });
      const alignErrors = report.errors.filter((e) => e.rule === 'template-params-align');
      expect(alignErrors).toHaveLength(0);
    });

    it('handles multiple template variables', () => {
      const report = validateDefinitions({
        resources: [
          validResource({
            uriTemplate: 'test://{orgId}/items/{itemId}',
            params: z.object({
              orgId: z.string().describe('Org ID'),
              itemId: z.string().describe('Item ID'),
            }),
          }),
        ],
      });
      const alignErrors = report.errors.filter((e) => e.rule === 'template-params-align');
      expect(alignErrors).toHaveLength(0);
    });

    it('errors on auth with empty scope strings', () => {
      const report = validateDefinitions({
        resources: [validResource({ auth: [''] })],
      });
      expect(report.errors).toContainEqual(expect.objectContaining({ rule: 'auth-scope-format' }));
    });
  });

  // -------------------------------------------------------------------------
  // Prompt rules
  // -------------------------------------------------------------------------

  describe('prompt rules', () => {
    it('errors on empty prompt name', () => {
      const report = validateDefinitions({ prompts: [validPrompt({ name: '' })] });
      expect(report.errors).toContainEqual(
        expect.objectContaining({ rule: 'name-required', definitionType: 'prompt' }),
      );
    });

    it('errors on duplicate prompt names', () => {
      const report = validateDefinitions({
        prompts: [validPrompt({ name: 'dup' }), validPrompt({ name: 'dup' })],
      });
      expect(report.errors).toContainEqual(
        expect.objectContaining({ rule: 'name-unique', definitionType: 'prompt' }),
      );
    });

    it('errors on missing generate function', () => {
      const report = validateDefinitions({
        prompts: [validPrompt({ generate: undefined })],
      });
      expect(report.errors).toContainEqual(expect.objectContaining({ rule: 'generate-required' }));
    });

    it('warns on missing description', () => {
      const report = validateDefinitions({
        prompts: [validPrompt({ description: '' })],
      });
      expect(report.warnings).toContainEqual(
        expect.objectContaining({ rule: 'description-required', definitionType: 'prompt' }),
      );
    });

    it('errors on non-ZodObject args', () => {
      const report = validateDefinitions({
        prompts: [validPrompt({ args: z.string() })],
      });
      expect(report.errors).toContainEqual(
        expect.objectContaining({
          rule: 'schema-is-object',
          message: expect.stringContaining('args'),
        }),
      );
    });

    it('warns on args fields missing .describe()', () => {
      const report = validateDefinitions({
        prompts: [
          validPrompt({
            args: z.object({ code: z.string() }),
          }),
        ],
      });
      expect(report.warnings).toContainEqual(
        expect.objectContaining({
          rule: 'describe-on-fields',
          message: expect.stringContaining('args.code'),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Report structure
  // -------------------------------------------------------------------------

  describe('report structure', () => {
    it('separates errors and warnings correctly', () => {
      const report = validateDefinitions({
        tools: [
          validTool({
            name: '',
            description: '',
            input: z.object({ x: z.string() }),
          }),
        ],
      });

      // name-required is an error, description-required is a warning
      expect(report.errors.every((d) => d.severity === 'error')).toBe(true);
      expect(report.warnings.every((d) => d.severity === 'warning')).toBe(true);
      expect(report.passed).toBe(false);
    });

    it('passes when only warnings exist', () => {
      const report = validateDefinitions({
        tools: [
          validTool({
            input: z.object({ noDesc: z.string() }),
          }),
        ],
      });

      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.errors).toHaveLength(0);
      expect(report.passed).toBe(true);
    });
  });
});
