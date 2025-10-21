/**
 * @fileoverview Provides a utility class for extracting and parsing YAML frontmatter from markdown.
 * Supports Obsidian-style and Jekyll-style frontmatter (YAML between --- delimiters).
 * Leverages the existing yamlParser for parsing extracted YAML content.
 * @module src/utils/parsing/frontmatterParser
 */
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import {
  type RequestContext,
  logger,
  requestContextService,
} from '@/utils/index.js';
import { yamlParser } from './yamlParser.js';

/**
 * Regular expression to extract frontmatter from markdown.
 * Matches YAML content between --- delimiters at the start of the document.
 * - Group 1: YAML content between delimiters
 * - Group 2: Remaining markdown content
 * @private
 */
const frontmatterRegex = /^---\s*\n([\s\S]*?)^---\s*([\s\S]*)$/m;

/**
 * Result of parsing markdown with frontmatter.
 * @template T The expected type of the parsed frontmatter object.
 */
export interface FrontmatterResult<T = unknown> {
  /**
   * Parsed frontmatter object. Empty object if no frontmatter found.
   */
  frontmatter: T;
  /**
   * Remaining markdown content after frontmatter extraction.
   * If no frontmatter exists, contains the original markdown.
   */
  content: string;
  /**
   * Indicates whether frontmatter was found and extracted.
   */
  hasFrontmatter: boolean;
}

/**
 * Utility class for extracting and parsing YAML frontmatter from markdown documents.
 * Supports Obsidian-style and Jekyll-style frontmatter (YAML between --- delimiters).
 * Uses the existing yamlParser for parsing, which also handles LLM <think> blocks.
 */
export class FrontmatterParser {
  /**
   * Extracts and parses YAML frontmatter from a markdown string.
   * If frontmatter is present, it's extracted and parsed using yamlParser.
   * If no frontmatter is found, returns the original content with an empty frontmatter object.
   *
   * @template T The expected type of the parsed frontmatter object. Defaults to `unknown`.
   * @param markdown - The markdown string potentially containing frontmatter.
   * @param context - Optional `RequestContext` for logging and error correlation.
   * @returns A `FrontmatterResult` containing parsed frontmatter and remaining content.
   * @throws {McpError} If frontmatter is malformed or YAML parsing fails.
   */
  parse<T = unknown>(
    markdown: string,
    context?: RequestContext,
  ): FrontmatterResult<T> {
    const match = markdown.match(frontmatterRegex);

    if (!match) {
      // No frontmatter found - return original content
      const logContext =
        context ||
        requestContextService.createRequestContext({
          operation: 'FrontmatterParser.noFrontmatter',
        });
      logger.debug('No frontmatter detected in markdown.', logContext);

      return {
        frontmatter: {} as T,
        content: markdown,
        hasFrontmatter: false,
      };
    }

    const yamlContent = match[1] ?? '';
    const markdownContent = match[2] ?? '';

    const logContext =
      context ||
      requestContextService.createRequestContext({
        operation: 'FrontmatterParser.parse',
      });

    logger.debug('Frontmatter detected, extracting and parsing.', {
      ...logContext,
      yamlLength: yamlContent.length,
      contentLength: markdownContent.length,
    });

    // Validate that we have YAML content
    const trimmedYaml = yamlContent.trim();
    if (!trimmedYaml) {
      logger.debug('Empty frontmatter block detected.', logContext);
      return {
        frontmatter: {} as T,
        content: markdownContent,
        hasFrontmatter: true,
      };
    }

    try {
      // Use existing yamlParser for parsing (handles <think> blocks too)
      const parsedFrontmatter = yamlParser.parse<T>(yamlContent, context);

      logger.debug('Frontmatter parsed successfully.', {
        ...logContext,
        frontmatterKeys:
          parsedFrontmatter &&
          typeof parsedFrontmatter === 'object' &&
          !Array.isArray(parsedFrontmatter)
            ? Object.keys(parsedFrontmatter)
            : [],
      });

      return {
        frontmatter: parsedFrontmatter,
        content: markdownContent,
        hasFrontmatter: true,
      };
    } catch (e: unknown) {
      const error = e as Error;
      const errorLogContext =
        context ||
        requestContextService.createRequestContext({
          operation: 'FrontmatterParser.parseError',
        });

      logger.error('Failed to parse frontmatter YAML content.', {
        ...errorLogContext,
        errorDetails: error.message,
        yamlContentSample: yamlContent.substring(0, 200),
      });

      // Re-throw McpError from yamlParser or create new one
      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        `Failed to parse frontmatter: ${error.message}`,
        {
          ...context,
          yamlContentSample:
            yamlContent.substring(0, 200) +
            (yamlContent.length > 200 ? '...' : ''),
          rawError: error instanceof Error ? error.stack : String(error),
        },
      );
    }
  }
}

/**
 * Singleton instance of the `FrontmatterParser`.
 * Use this instance to extract and parse YAML frontmatter from markdown documents.
 * @example
 * ```typescript
 * import { frontmatterParser, requestContextService } from './utils';
 * const context = requestContextService.createRequestContext({ operation: 'ParseObsidianNote' });
 *
 * // Markdown with frontmatter
 * const markdown = `---
 * title: My Note
 * tags: [productivity, notes]
 * date: 2025-01-15
 * ---
 *
 * # Note Content
 * This is the actual note.`;
 *
 * const result = frontmatterParser.parse(markdown, context);
 * console.log(result.frontmatter); // { title: 'My Note', tags: [...], date: '2025-01-15' }
 * console.log(result.content);     // '# Note Content\nThis is the actual note.'
 * console.log(result.hasFrontmatter); // true
 *
 * // Markdown without frontmatter
 * const plainMarkdown = '# Just Content';
 * const result2 = frontmatterParser.parse(plainMarkdown, context);
 * console.log(result2.frontmatter); // {}
 * console.log(result2.content);     // '# Just Content'
 * console.log(result2.hasFrontmatter); // false
 * ```
 */
export const frontmatterParser = new FrontmatterParser();
