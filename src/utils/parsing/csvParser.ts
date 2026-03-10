/**
 * @fileoverview Provides a utility class for parsing CSV strings.
 * It wraps the 'papaparse' library and includes functionality to handle
 * optional <think>...</think> blocks often found at the beginning of LLM outputs.
 * @module src/utils/parsing/csvParser
 */
import type Papa from 'papaparse';

import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';
import { type RequestContext, requestContextService } from '@/utils/internal/requestContext.js';
import { thinkBlockRegex } from './thinkBlock.js';

let _papa: typeof Papa | undefined;
async function getPapa() {
  if (!_papa) {
    const mod = await import('papaparse').catch(() => {
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'Install "papaparse" to use CSV parsing: bun add papaparse',
      );
    });
    // Handle CJS/ESM interop — papaparse uses `export =`
    _papa = ('default' in mod ? (mod.default as typeof Papa) : mod) as typeof Papa;
  }
  return _papa;
}

/**
 * Utility class for parsing CSV strings.
 * Wraps the 'papaparse' library for robust CSV parsing and handles
 * optional <think> blocks from LLMs.
 */
export class CsvParser {
  /**
   * Parses a CSV string, which may be prefixed with a <think> block.
   * If a <think> block is present, its content is logged, and parsing proceeds on the
   * remainder.
   *
   * @template T The expected type of the parsed CSV data. Defaults to `any`.
   * @param csvString - The CSV string to parse.
   * @param options - Optional `ParseConfig` for papaparse.
   * @param context - Optional `RequestContext` for logging and error correlation.
   * @returns The parsed CSV data.
   * @throws {McpError} If the string is empty after processing or if parsing fails.
   */
  async parse<T = unknown>(
    csvString: string,
    options?: Papa.ParseConfig,
    context?: RequestContext,
  ): Promise<Papa.ParseResult<T>> {
    let stringToParse = csvString;
    const match = csvString.match(thinkBlockRegex);

    if (match) {
      const thinkContent = match[1]?.trim() ?? '';
      const restOfString = match[2] ?? '';

      const logContext =
        context ||
        requestContextService.createRequestContext({
          operation: 'CsvParser.thinkBlock',
        });
      if (thinkContent) {
        logger.debug('LLM <think> block detected and logged.', {
          ...logContext,
          thinkContent,
        });
      } else {
        logger.debug('Empty LLM <think> block detected.', logContext);
      }
      stringToParse = restOfString;
    }

    stringToParse = stringToParse.trim();

    if (!stringToParse) {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'CSV string is empty after removing <think> block and trimming.',
        context,
      );
    }

    const papa = await getPapa();
    const result = papa.parse<T>(stringToParse, options);

    if (result.errors.length > 0) {
      const errorLogContext =
        context ||
        requestContextService.createRequestContext({
          operation: 'CsvParser.parseError',
        });
      logger.error('Failed to parse CSV content.', {
        ...errorLogContext,
        errors: result.errors,
        contentAttempted: stringToParse.substring(0, 200),
      });

      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        `Failed to parse CSV: ${result.errors.map((e) => e.message).join(', ')}`,
        {
          ...context,
          errors: result.errors,
          originalContentSample:
            stringToParse.substring(0, 200) + (stringToParse.length > 200 ? '...' : ''),
        },
      );
    }

    return result;
  }
}

/**
 * Singleton instance of the `CsvParser`.
 * Use this instance to parse CSV strings, with support for <think> blocks.
 * @example
 * ```typescript
 * import { csvParser, requestContextService } from './utils';
 * const context = requestContextService.createRequestContext({ operation: 'TestCsvParsing' });
 *
 * const csv = 'a,b,c\n1,2,3';
 * const parsedCsv = csvParser.parse(csv, { header: true }, context);
 * console.log(parsedCsv.data); // Output: [ { a: '1', b: '2', c: '3' } ]
 *
 * const csvWithThink = '<think>This is a thought.</think>a,b,c\n1,2,3';
 * const parsedWithThink = csvParser.parse(csvWithThink, { header: true }, context);
 * console.log(parsedWithThink.data); // Output: [ { a: '1', b: '2', c: '3' } ]
 * ```
 */
export const csvParser = new CsvParser();
