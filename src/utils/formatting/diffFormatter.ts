/**
 * @fileoverview Diff formatter utility for comparing text and generating unified diffs.
 * Wraps the 'diff' library (jsdiff) to provide git-style diff output with proper error
 * handling and logging integration.
 * @module src/utils/formatting/diffFormatter
 */

import * as Diff from 'diff';

import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import {
  type RequestContext,
  logger,
  requestContextService,
} from '@/utils/index.js';

/**
 * Diff output format options.
 */
export type DiffFormat = 'unified' | 'patch' | 'inline';

/**
 * Configuration options for diff formatting.
 */
export interface DiffFormatterOptions {
  /**
   * Number of unchanged lines to show around each change (default: 3).
   * This is the "context" in unified diff format.
   */
  context?: number;

  /**
   * Output format for the diff.
   * - unified: Standard unified diff format (like `git diff`)
   * - patch: Include file headers (---, +++)
   * - inline: Inline diff with context
   */
  format?: DiffFormat;

  /**
   * Whether to include line numbers in the output (default: true).
   */
  showLineNumbers?: boolean;

  /**
   * Whether to include file headers in patch format (default: true).
   */
  includeHeaders?: boolean;

  /**
   * File path for old version (used in headers).
   */
  oldPath?: string;

  /**
   * File path for new version (used in headers).
   */
  newPath?: string;
}

/**
 * Utility class for generating diffs between text content.
 * Provides git-style unified diff output with configurable formatting options.
 */
export class DiffFormatter {
  /**
   * Default formatting options.
   * @private
   */
  private readonly defaultOptions: Required<
    Omit<DiffFormatterOptions, 'oldPath' | 'newPath'>
  > = {
    context: 3,
    format: 'unified',
    showLineNumbers: true,
    includeHeaders: true,
  };

  /**
   * Generate a unified diff between two text strings.
   * Compares line-by-line and produces output similar to `git diff`.
   *
   * @param oldText - Original text content
   * @param newText - Modified text content
   * @param options - Diff formatting options
   * @param context - Optional request context for logging
   * @returns Formatted diff string
   * @throws {McpError} If diff generation fails
   *
   * @example
   * ```typescript
   * const oldCode = 'function hello() {\n  console.log("Hi");\n}';
   * const newCode = 'function hello(name) {\n  console.log(`Hello, ${name}!`);\n}';
   * const diff = diffFormatter.diff(oldCode, newCode, { context: 2 });
   * ```
   */
  diff(
    oldText: string,
    newText: string,
    options?: DiffFormatterOptions,
    context?: RequestContext,
  ): string {
    const logContext =
      context ||
      requestContextService.createRequestContext({
        operation: 'DiffFormatter.diff',
      });

    // Validate inputs
    if (typeof oldText !== 'string' || typeof newText !== 'string') {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'Both oldText and newText must be strings',
        logContext,
      );
    }

    const opts: Required<Omit<DiffFormatterOptions, 'oldPath' | 'newPath'>> &
      Pick<DiffFormatterOptions, 'oldPath' | 'newPath'> = {
      ...this.defaultOptions,
      ...options,
    };

    try {
      // Split into lines for diffing
      const oldLines = this.splitLines(oldText);
      const newLines = this.splitLines(newText);

      logger.debug('Generating diff', {
        ...logContext,
        oldLines: oldLines.length,
        newLines: newLines.length,
        format: opts.format,
      });

      // Generate diff using jsdiff library
      const patches = Diff.createPatch(
        opts.oldPath || 'a/file',
        oldText,
        newText,
        opts.oldPath || 'old',
        opts.newPath || 'new',
        { context: opts.context },
      );

      // Format based on selected format
      const result = this.formatDiff(patches, opts);

      logger.debug('Diff generated successfully', {
        ...logContext,
        resultLength: result.length,
      });

      return result;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('Failed to generate diff', {
        ...logContext,
        error: err.message,
      });

      throw new McpError(
        JsonRpcErrorCode.InternalError,
        `Failed to generate diff: ${err.message}`,
        { ...logContext, originalError: err.stack },
      );
    }
  }

  /**
   * Generate a diff between two arrays of lines.
   * Useful when you've already split text into lines.
   *
   * @param oldLines - Original lines
   * @param newLines - Modified lines
   * @param options - Diff formatting options
   * @param context - Optional request context for logging
   * @returns Formatted diff string
   * @throws {McpError} If diff generation fails
   *
   * @example
   * ```typescript
   * const oldLines = ['line 1', 'line 2', 'line 3'];
   * const newLines = ['line 1', 'modified line 2', 'line 3', 'line 4'];
   * const diff = diffFormatter.diffLines(oldLines, newLines);
   * ```
   */
  diffLines(
    oldLines: string[],
    newLines: string[],
    options?: DiffFormatterOptions,
    context?: RequestContext,
  ): string {
    const logContext =
      context ||
      requestContextService.createRequestContext({
        operation: 'DiffFormatter.diffLines',
      });

    // Validate inputs
    if (!Array.isArray(oldLines) || !Array.isArray(newLines)) {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'Both oldLines and newLines must be arrays',
        logContext,
      );
    }

    // Join arrays back into text and use main diff method
    const oldText = oldLines.join('\n');
    const newText = newLines.join('\n');

    return this.diff(oldText, newText, options, logContext);
  }

  /**
   * Generate a word-level diff between two text strings.
   * Highlights changes at the word level rather than line level.
   * Useful for prose and documentation.
   *
   * @param oldText - Original text content
   * @param newText - Modified text content
   * @param context - Optional request context for logging
   * @returns Formatted word diff string
   * @throws {McpError} If diff generation fails
   *
   * @example
   * ```typescript
   * const old = 'The quick brown fox';
   * const new = 'The fast brown dog';
   * const diff = diffFormatter.diffWords(old, new);
   * ```
   */
  diffWords(
    oldText: string,
    newText: string,
    context?: RequestContext,
  ): string {
    const logContext =
      context ||
      requestContextService.createRequestContext({
        operation: 'DiffFormatter.diffWords',
      });

    // Validate inputs
    if (typeof oldText !== 'string' || typeof newText !== 'string') {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'Both oldText and newText must be strings',
        logContext,
      );
    }

    try {
      logger.debug('Generating word-level diff', logContext);

      const changes = Diff.diffWords(oldText, newText);

      // Format word diff as inline changes
      const result = changes
        .map((part) => {
          if (part.added) {
            return `[+${part.value}+]`;
          } else if (part.removed) {
            return `[-${part.value}-]`;
          }
          return part.value;
        })
        .join('');

      logger.debug('Word diff generated successfully', {
        ...logContext,
        changeCount: changes.length,
      });

      return result;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('Failed to generate word diff', {
        ...logContext,
        error: err.message,
      });

      throw new McpError(
        JsonRpcErrorCode.InternalError,
        `Failed to generate word diff: ${err.message}`,
        { ...logContext, originalError: err.stack },
      );
    }
  }

  /**
   * Format diff output based on selected format.
   * @private
   */
  private formatDiff(
    patch: string,
    options: Required<Omit<DiffFormatterOptions, 'oldPath' | 'newPath'>> &
      Pick<DiffFormatterOptions, 'oldPath' | 'newPath'>,
  ): string {
    switch (options.format) {
      case 'patch':
        // Full patch format with headers
        return options.includeHeaders ? patch : this.stripHeaders(patch);

      case 'unified':
        // Standard unified diff (no file headers)
        return this.stripHeaders(patch);

      case 'inline':
        // Inline diff with context
        return this.formatInline(patch);

      default:
        return patch;
    }
  }

  /**
   * Strip file headers from patch output.
   * @private
   */
  private stripHeaders(patch: string): string {
    const lines = patch.split('\n');
    // Skip first 4 lines (---, +++, Index, ===)
    const startIndex = lines.findIndex((line) => line.startsWith('@@'));
    if (startIndex === -1) {
      return patch;
    }
    return lines.slice(startIndex).join('\n');
  }

  /**
   * Format diff as inline changes.
   * @private
   */
  private formatInline(patch: string): string {
    // Keep the patch as-is for inline format
    // In a more advanced implementation, this could format
    // changes inline with visual markers
    return patch;
  }

  /**
   * Split text into lines, preserving line endings.
   * @private
   */
  private splitLines(text: string): string[] {
    if (!text) {
      return [];
    }
    return text.split(/\r?\n/);
  }

  /**
   * Check if two text strings are identical.
   * Useful for quick comparison before generating diffs.
   *
   * @param text1 - First text string
   * @param text2 - Second text string
   * @returns True if texts are identical
   *
   * @example
   * ```typescript
   * if (!diffFormatter.isEqual(oldText, newText)) {
   *   const diff = diffFormatter.diff(oldText, newText);
   *   console.log(diff);
   * }
   * ```
   */
  isEqual(text1: string, text2: string): boolean {
    return text1 === text2;
  }

  /**
   * Get statistics about the differences between two texts.
   * Returns counts of additions, deletions, and total changes.
   *
   * @param oldText - Original text content
   * @param newText - Modified text content
   * @param context - Optional request context for logging
   * @returns Object containing diff statistics
   * @throws {McpError} If analysis fails
   *
   * @example
   * ```typescript
   * const stats = diffFormatter.getStats(oldText, newText);
   * console.log(`+${stats.additions} -${stats.deletions}`);
   * ```
   */
  getStats(
    oldText: string,
    newText: string,
    context?: RequestContext,
  ): { additions: number; deletions: number; changes: number } {
    const logContext =
      context ||
      requestContextService.createRequestContext({
        operation: 'DiffFormatter.getStats',
      });

    try {
      const changes = Diff.diffLines(oldText, newText);

      const additions = changes
        .filter((c) => c.added)
        .reduce((sum, c) => sum + (c.count || 0), 0);

      const deletions = changes
        .filter((c) => c.removed)
        .reduce((sum, c) => sum + (c.count || 0), 0);

      return {
        additions,
        deletions,
        changes: additions + deletions,
      };
    } catch (error: unknown) {
      const err = error as Error;
      throw new McpError(
        JsonRpcErrorCode.InternalError,
        `Failed to get diff stats: ${err.message}`,
        { ...logContext, originalError: err.stack },
      );
    }
  }
}

/**
 * Singleton instance of DiffFormatter.
 * Use this instance to generate diffs between text content.
 *
 * @example
 * ```typescript
 * import { diffFormatter } from '@/utils/index.js';
 *
 * const oldCode = `function hello() {
 *   console.log('Hi');
 * }`;
 *
 * const newCode = `function hello(name: string) {
 *   console.log(\`Hello, \${name}!\`);
 * }`;
 *
 * // Generate unified diff
 * const diff = diffFormatter.diff(oldCode, newCode);
 * console.log(diff);
 *
 * // Get statistics
 * const stats = diffFormatter.getStats(oldCode, newCode);
 * console.log(`Changes: +${stats.additions} -${stats.deletions}`);
 *
 * // Word-level diff for prose
 * const wordDiff = diffFormatter.diffWords(
 *   'The quick brown fox',
 *   'The fast brown dog'
 * );
 * console.log(wordDiff);
 * ```
 */
export const diffFormatter = new DiffFormatter();
