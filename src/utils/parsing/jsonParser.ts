/**
 * @fileoverview Provides a utility class for parsing potentially partial JSON strings.
 * It wraps the 'partial-json' npm library and includes functionality to handle
 * optional <think>...</think> blocks often found at the beginning of LLM outputs.
 * @module src/utils/parsing/jsonParser
 */
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';
import { type RequestContext, requestContextService } from '@/utils/internal/requestContext.js';
import { thinkBlockRegex } from './thinkBlock.js';

let _partialJson: typeof import('partial-json') | undefined;
async function getPartialJson() {
  _partialJson ??= await import('partial-json').catch(() => {
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      'Install "partial-json" to use partial JSON parsing: bun add partial-json',
    );
  });
  return _partialJson;
}

/**
 * Bit flags specifying which partial JSON types are permissible during parsing.
 * Mirrors `partial-json`'s `Allow` constants. Combine with bitwise OR.
 */
export const Allow = {
  STR: 0x1,
  NUM: 0x2,
  ARR: 0x4,
  OBJ: 0x8,
  NULL: 0x10,
  BOOL: 0x20,
  NAN: 0x40,
  INFINITY: 0x80,
  _INFINITY: 0x100,
  INF: 0x80 | 0x100,
  SPECIAL: 0x10 | 0x20 | 0x40 | 0x80 | 0x100,
  ATOM: 0x1 | 0x2 | 0x10 | 0x20 | 0x40 | 0x80 | 0x100,
  COLLECTION: 0x4 | 0x8,
  ALL: 0x1 | 0x2 | 0x4 | 0x8 | 0x10 | 0x20 | 0x40 | 0x80 | 0x100,
} as const;

/**
 * Utility class for parsing potentially partial JSON strings.
 * Wraps the 'partial-json' library for robust JSON parsing, handling
 * incomplete structures and optional <think> blocks from LLMs.
 */
export class JsonParser {
  /**
   * Parses a JSON string, which may be partial or prefixed with a <think> block.
   * If a <think> block is present, its content is logged, and parsing proceeds on the
   * remainder. Uses 'partial-json' to handle incomplete JSON.
   *
   * @template T The expected type of the parsed JSON object. Defaults to `any`.
   * @param jsonString - The JSON string to parse.
   * @param allowPartial - Bitwise OR combination of `Allow` constants specifying permissible
   *   partial JSON types. Defaults to `Allow.ALL`.
   * @param context - Optional `RequestContext` for logging and error correlation.
   * @returns The parsed JavaScript value.
   * @throws {McpError} If the string is empty after processing or if `partial-json` fails.
   */
  async parse<T = unknown>(
    jsonString: string,
    allowPartial: number = Allow.ALL,
    context?: RequestContext,
  ): Promise<T> {
    let stringToParse = jsonString;
    const match = jsonString.match(thinkBlockRegex);

    if (match) {
      const thinkContent = match[1]?.trim() ?? '';
      const restOfString = match[2] ?? '';

      const logContext =
        context ||
        requestContextService.createRequestContext({
          operation: 'JsonParser.thinkBlock',
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
        'JSON string is empty after removing <think> block and trimming.',
        context,
      );
    }

    try {
      const { parse: parsePartialJson } = await getPartialJson();
      return parsePartialJson(stringToParse, allowPartial) as T;
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      const errorLogContext =
        context ||
        requestContextService.createRequestContext({
          operation: 'JsonParser.parseError',
        });
      logger.error('Failed to parse JSON content.', {
        ...errorLogContext,
        errorDetails: error.message,
        contentAttempted: stringToParse.substring(0, 200),
      });

      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        `Failed to parse JSON: ${error.message}`,
        {
          ...context,
          originalContentSample:
            stringToParse.substring(0, 200) + (stringToParse.length > 200 ? '...' : ''),
          rawError: error instanceof Error ? error.stack : String(error),
        },
      );
    }
  }
}

/**
 * Singleton instance of the `JsonParser`.
 * Use this instance to parse JSON strings, with support for partial JSON and <think> blocks.
 * @example
 * ```typescript
 * import { jsonParser, Allow, requestContextService } from './utils';
 * const context = requestContextService.createRequestContext({ operation: 'TestJsonParsing' });
 *
 * const fullJson = '{"key": "value"}';
 * const parsedFull = jsonParser.parse(fullJson, Allow.ALL, context);
 * console.log(parsedFull); // Output: { key: 'value' }
 *
 * const partialObject = '<think>This is a thought.</think>{"key": "value", "arr": [1,';
 * try {
 *   const parsedPartial = jsonParser.parse(partialObject, undefined, context);
 *   console.log(parsedPartial);
 * } catch (e) {
 *   console.error("Parsing partial object failed:", e);
 * }
 * ```
 */
export const jsonParser = new JsonParser();
