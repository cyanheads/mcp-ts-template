/**
 * @fileoverview Tests for the XmlParser utility handling <think> blocks and errors.
 * @module tests/utils/parsing/xmlParser.test
 */
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import {
  JsonRpcErrorCode,
  McpError,
} from '../../../src/types-global/errors.js';
import { XmlParser } from '../../../src/utils/parsing/xmlParser.js';
import { logger } from '../../../src/utils/index.js';

describe('XmlParser', () => {
  const debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
  const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    debugSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('parses XML without a think block', () => {
    const parser = new XmlParser();
    const xml = '<root><item>value</item></root>';

    const result = parser.parse(xml);

    expect(result).toEqual({ root: { item: 'value' } });
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('parses XML and logs when a think block has content', () => {
    const parser = new XmlParser();
    const xml =
      '<think> Reasoning notes </think><root><item>value</item></root>';

    const result = parser.parse(xml);

    expect(result).toEqual({ root: { item: 'value' } });
    expect(debugSpy).toHaveBeenCalledWith(
      'LLM <think> block detected and logged.',
      expect.objectContaining({ thinkContent: 'Reasoning notes' }),
    );
  });

  it('parses XML and logs when a think block is empty', () => {
    const parser = new XmlParser();
    const xml = '<think>   </think><root><item>value</item></root>';

    const result = parser.parse(xml);

    expect(result).toEqual({ root: { item: 'value' } });
    expect(debugSpy).toHaveBeenCalledWith(
      'Empty LLM <think> block detected.',
      expect.objectContaining({ operation: 'XmlParser.thinkBlock' }),
    );
  });

  it('throws an McpError when XML is empty after trimming', () => {
    const parser = new XmlParser();

    try {
      parser.parse('   ');
      throw new Error('parse should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(McpError);
      if (error instanceof McpError) {
        expect(error.code).toBe(JsonRpcErrorCode.ValidationError);
        expect(error.message).toBe(
          'XML string is empty after removing <think> block and trimming.',
        );
      }
    }
  });

  it('wraps parser errors in an McpError and logs details', () => {
    const parser = new XmlParser();
    const xml = '<'; // triggers fast-xml-parser failure

    expect(() => parser.parse(xml)).toThrowError(McpError);

    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to parse XML content.',
      expect.objectContaining({
        errorDetails: expect.any(String),
        contentAttempted: '<',
      }),
    );
  });
});
