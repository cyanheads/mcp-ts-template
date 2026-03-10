/**
 * @fileoverview Provides a utility class for parsing XML strings.
 * It wraps the 'fast-xml-parser' library and includes functionality to handle
 * optional <think>...</think> blocks often found at the beginning of LLM outputs.
 * @module src/utils/parsing/xmlParser
 */
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';
import { type RequestContext, requestContextService } from '@/utils/internal/requestContext.js';
import { thinkBlockRegex } from './thinkBlock.js';

let _fxp: typeof import('fast-xml-parser') | undefined;
let _xmlParserInstance: { parse(data: string): unknown } | undefined;
async function getFxp() {
  _fxp ??= await import('fast-xml-parser').catch(() => {
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      'Install "fast-xml-parser" to use XML parsing: bun add fast-xml-parser',
    );
  });
  return _fxp;
}

/**
 * Utility class for parsing XML strings.
 * Wraps the 'fast-xml-parser' library for robust XML parsing and handles
 * optional <think> blocks from LLMs.
 */
export class XmlParser {
  /**
   * Parses an XML string, which may be prefixed with a <think> block.
   * If a <think> block is present, its content is logged, and parsing proceeds on the
   * remainder.
   *
   * @template T The expected type of the parsed XML object. Defaults to `any`.
   * @param xmlString - The XML string to parse.
   * @param context - Optional `RequestContext` for logging and error correlation.
   * @returns The parsed JavaScript object.
   * @throws {McpError} If the string is empty after processing or if parsing fails.
   */
  async parse<T = unknown>(xmlString: string, context?: RequestContext): Promise<T> {
    let stringToParse = xmlString;
    const match = xmlString.match(thinkBlockRegex);

    if (match) {
      const thinkContent = match[1]?.trim() ?? '';
      const restOfString = match[2] ?? '';

      const logContext =
        context ||
        requestContextService.createRequestContext({
          operation: 'XmlParser.thinkBlock',
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
        'XML string is empty after removing <think> block and trimming.',
        context,
      );
    }

    try {
      const fxp = await getFxp();
      _xmlParserInstance ??= new fxp.XMLParser({
        processEntities: false,
        htmlEntities: false,
      });
      return _xmlParserInstance.parse(stringToParse) as T;
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      const errorLogContext =
        context ||
        requestContextService.createRequestContext({
          operation: 'XmlParser.parseError',
        });
      logger.error('Failed to parse XML content.', {
        ...errorLogContext,
        errorDetails: error.message,
        contentAttempted: stringToParse.substring(0, 200),
      });

      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        `Failed to parse XML: ${error.message}`,
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
 * Singleton instance of the `XmlParser`.
 * Use this instance to parse XML strings, with support for <think> blocks.
 * @example
 * ```typescript
 * import { xmlParser, requestContextService } from './utils';
 * const context = requestContextService.createRequestContext({ operation: 'TestXmlParsing' });
 *
 * const xml = '<root><key>value</key></root>';
 * const parsedXml = xmlParser.parse(xml, context);
 * console.log(parsedXml); // Output: { root: { key: 'value' } }
 *
 * const xmlWithThink = '<think>This is a thought.</think><root><key>value</key></root>';
 * const parsedWithThink = xmlParser.parse(xmlWithThink, context);
 * console.log(parsedWithThink); // Output: { root: { key: 'value' } }
 * ```
 */
export const xmlParser = new XmlParser();
