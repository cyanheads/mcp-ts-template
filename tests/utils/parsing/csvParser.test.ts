/**
 * @fileoverview Unit tests for the CSV parser utility.
 * @module tests/utils/parsing/csvParser.test
 */
import Papa from 'papaparse';
import type { ParseConfig, ParseError, ParseResult } from 'papaparse';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { csvParser } from '@/utils/parsing/csvParser.js';
import { logger, requestContextService } from '@/utils/index.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('csvParser.parse', () => {
  const createContext = () =>
    requestContextService.createRequestContext({
      operation: 'csv-parser-test',
    });

  it('parses a basic CSV string with headers', () => {
    const csv = 'name,age\nAda,36\nGrace,45';
    const result = csvParser.parse<{ name: string; age: string }>(csv, {
      header: true,
    });

    expect(result.data).toEqual([
      { name: 'Ada', age: '36' },
      { name: 'Grace', age: '45' },
    ]);
  });

  it('strips a <think> block before parsing and logs through provided context', () => {
    const context = createContext();
    const csv = '<think>pre-computation</think>name,age\nAda,36';
    const result = csvParser.parse<{ name: string; age: string }>(
      csv,
      { header: true },
      context,
    );

    expect(result.data).toEqual([{ name: 'Ada', age: '36' }]);
  });

  it('throws when the CSV content is empty after removing the think block', () => {
    try {
      csvParser.parse('<think>thoughts</think>   ');
      throw new Error('Expected csvParser.parse to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(McpError);
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.ValidationError);
      expect(mcpError.message).toContain('CSV string is empty');
    }
  });

  it('wraps parser errors into an McpError', () => {
    const context = createContext();
    const parserError: ParseError = {
      type: 'Quotes',
      code: 'MissingQuotes',
      message: 'Mismatched quotes',
    };

    const parseResult: ParseResult<unknown> = {
      data: [],
      errors: [parserError],
      meta: {
        delimiter: ',',
        linebreak: '\n',
        aborted: false,
        truncated: false,
        cursor: 0,
      },
    };

    const parseSpy = vi.spyOn(
      Papa as unknown as {
        parse: (
          csvString: string,
          config?: ParseConfig<unknown>,
        ) => ParseResult<unknown>;
      },
      'parse',
    );
    parseSpy.mockImplementation(() => parseResult);

    try {
      csvParser.parse('name,age\n"Ada,36', undefined, context);
      throw new Error('Expected csvParser.parse to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(McpError);
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(JsonRpcErrorCode.ValidationError);
      expect(mcpError.message).toContain('Failed to parse CSV');
      expect(mcpError.data).toMatchObject({ errors: [parserError] });
    }
  });

  it('logs an empty think block and auto-creates a context when none is supplied', () => {
    const debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
    const csv = '<think>   </think>name,age\nAda,36';

    const result = csvParser.parse<{ name: string; age: string }>(csv, {
      header: true,
    });

    expect(result.data).toEqual([{ name: 'Ada', age: '36' }]);
    expect(debugSpy).toHaveBeenCalledWith(
      'Empty LLM <think> block detected.',
      expect.objectContaining({ operation: 'CsvParser.thinkBlock' }),
    );

    debugSpy.mockRestore();
  });

  it('logs parser errors with an auto-generated context when none is supplied', () => {
    const parserError: ParseError = {
      type: 'Quotes',
      code: 'MissingQuotes',
      message: 'Mismatched quotes',
    };

    const parseResult: ParseResult<unknown> = {
      data: [],
      errors: [parserError],
      meta: {
        delimiter: ',',
        linebreak: '\n',
        aborted: false,
        truncated: false,
        cursor: 0,
      },
    };

    vi.spyOn(
      Papa as unknown as {
        parse: (
          csvString: string,
          config?: ParseConfig<unknown>,
        ) => ParseResult<unknown>;
      },
      'parse',
    ).mockImplementation(() => parseResult);

    const errorSpy = vi.spyOn(logger, 'error');

    expect(() => csvParser.parse('name,age\n"Ada,36')).toThrow(McpError);
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to parse CSV content.',
      expect.objectContaining({ operation: 'CsvParser.parseError' }),
    );

    errorSpy.mockRestore();
  });
});
