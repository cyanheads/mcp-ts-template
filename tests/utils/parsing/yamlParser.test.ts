/**
 * @fileoverview Unit tests for the YAML parser utility.
 * @module tests/utils/parsing/yamlParser.test
 */
import { describe, expect, it, vi } from 'vitest';

import { yamlParser } from '@/utils/parsing/yamlParser.js';
import { logger, requestContextService } from '@/utils/index.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

describe('yamlParser.parse', () => {
  const createContext = () =>
    requestContextService.createRequestContext({
      operation: 'yaml-parser-test',
    });

  it('parses YAML content successfully', () => {
    const yamlString = 'name: Ada\nrole: Engineer';
    const result = yamlParser.parse<Record<string, string>>(yamlString);
    expect(result).toEqual({ name: 'Ada', role: 'Engineer' });
  });

  it('parses YAML content after stripping a think block', () => {
    const context = createContext();
    const yamlString = '<think>deliberation</think>name: Grace\nrole: Admiral';
    const result = yamlParser.parse<Record<string, string>>(
      yamlString,
      context,
    );
    expect(result).toEqual({ name: 'Grace', role: 'Admiral' });
  });

  it('throws when the remaining content is empty', () => {
    expect(() => yamlParser.parse('<think>only thoughts</think>   ')).toThrow(
      McpError,
    );
  });

  it('wraps parser failures in an McpError', () => {
    const context = createContext();
    try {
      yamlParser.parse('invalid: [unterminated', context);
      throw new Error('Expected yamlParser.parse to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(McpError);
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.ValidationError);
      expect(mcpError.message).toContain('Failed to parse YAML');
    }
  });

  it('logs parse failures with an auto-generated context when none is provided', () => {
    const errorSpy = vi.spyOn(logger, 'error');
    expect(() => yamlParser.parse('invalid: [unterminated')).toThrow(McpError);
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to parse YAML content.',
      expect.objectContaining({ operation: 'YamlParser.parseError' }),
    );
    errorSpy.mockRestore();
  });

  it('logs an empty think block with an auto-generated context when none is provided', () => {
    const debugSpy = vi.spyOn(logger, 'debug');
    const yamlString = '<think></think>key: value';

    const result = yamlParser.parse<Record<string, string>>(yamlString);

    expect(result).toEqual({ key: 'value' });
    expect(debugSpy).toHaveBeenCalledWith(
      'Empty LLM <think> block detected.',
      expect.objectContaining({ operation: 'YamlParser.thinkBlock' }),
    );

    debugSpy.mockRestore();
  });
});
