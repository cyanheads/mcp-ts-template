/**
 * @fileoverview Table formatter utility for creating tables in multiple formats.
 * Supports markdown, ASCII, grid (Unicode), and compact table styles with configurable
 * alignment, truncation, and formatting options.
 * @module src/utils/formatting/tableFormatter
 */

import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import {
  type RequestContext,
  logger,
  requestContextService,
} from '@/utils/index.js';

/**
 * Table output style options.
 */
export type TableStyle = 'markdown' | 'ascii' | 'grid' | 'compact';

/**
 * Column alignment options.
 */
export type Alignment = 'left' | 'center' | 'right';

/**
 * Configuration options for table formatting.
 */
export interface TableFormatterOptions {
  /**
   * Table style to use for rendering.
   * - markdown: GitHub-style markdown tables (| Header | Header |)
   * - ascii: ASCII box drawing with +, -, | characters
   * - grid: Unicode box-drawing characters (┌─┬─┐)
   * - compact: Space-separated columns (no borders)
   */
  style?: TableStyle;

  /**
   * Column-specific alignment configuration.
   * Key is column name (for object arrays) or index (for raw arrays).
   * @example { name: 'left', age: 'right', email: 'center' }
   */
  alignment?: Record<string, Alignment>;

  /**
   * Maximum width for any column. Content exceeding this will be truncated.
   */
  maxWidth?: number;

  /**
   * Whether to truncate long content with ellipsis (default: true).
   * If false, content may wrap or overflow depending on style.
   */
  truncate?: boolean;

  /**
   * Header styling option.
   * - bold: Headers in bold (markdown only)
   * - uppercase: Convert headers to uppercase
   * - none: No special header formatting
   */
  headerStyle?: 'bold' | 'uppercase' | 'none';

  /**
   * Minimum column width (default: 3).
   */
  minWidth?: number;

  /**
   * Padding around cell content (default: 1 space).
   */
  padding?: number;
}

/**
 * Internal column metadata for rendering.
 * @private
 */
interface ColumnInfo {
  name: string;
  width: number;
  alignment: Alignment;
}

/**
 * Utility class for formatting tabular data into various table styles.
 * Provides methods for rendering arrays of objects or raw 2D arrays as tables.
 */
export class TableFormatter {
  /**
   * Default formatting options.
   * @private
   */
  private readonly defaultOptions: Required<TableFormatterOptions> = {
    style: 'markdown',
    alignment: {},
    maxWidth: 50,
    truncate: true,
    headerStyle: 'none',
    minWidth: 3,
    padding: 1,
  };

  /**
   * Format an array of objects as a table.
   * Automatically extracts headers from object keys.
   *
   * @template T - Type of objects in the array
   * @param data - Array of objects to format
   * @param options - Table formatting options
   * @param context - Optional request context for logging
   * @returns Formatted table string
   * @throws {McpError} If data is invalid or formatting fails
   *
   * @example
   * ```typescript
   * const data = [
   *   { name: 'Alice', age: 30, role: 'Engineer' },
   *   { name: 'Bob', age: 25, role: 'Designer' }
   * ];
   * const table = tableFormatter.format(data, { style: 'grid' });
   * ```
   */
  format<T extends Record<string, unknown>>(
    data: T[],
    options?: TableFormatterOptions,
    context?: RequestContext,
  ): string {
    const logContext =
      context ||
      requestContextService.createRequestContext({
        operation: 'TableFormatter.format',
      });

    if (!Array.isArray(data)) {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'Data must be an array',
        logContext,
      );
    }

    if (data.length === 0) {
      logger.debug('Empty data array provided to table formatter', logContext);
      return '';
    }

    // Extract headers from first object
    const headers = Object.keys(data[0]!);

    // Convert objects to 2D array
    const rows = data.map((obj) =>
      headers.map((header) => this.stringify(obj[header])),
    );

    logger.debug('Formatting table from object array', {
      ...logContext,
      rowCount: rows.length,
      columnCount: headers.length,
    });

    return this.formatRaw(headers, rows, options, context);
  }

  /**
   * Format a raw 2D array with explicit headers.
   * Provides full control over headers and cell values.
   *
   * @param headers - Array of column headers
   * @param rows - 2D array of cell values
   * @param options - Table formatting options
   * @param context - Optional request context for logging
   * @returns Formatted table string
   * @throws {McpError} If headers/rows are invalid or formatting fails
   *
   * @example
   * ```typescript
   * const headers = ['Name', 'Age', 'Role'];
   * const rows = [
   *   ['Alice', '30', 'Engineer'],
   *   ['Bob', '25', 'Designer']
   * ];
   * const table = tableFormatter.formatRaw(headers, rows, { style: 'ascii' });
   * ```
   */
  formatRaw(
    headers: string[],
    rows: string[][],
    options?: TableFormatterOptions,
    context?: RequestContext,
  ): string {
    const logContext =
      context ||
      requestContextService.createRequestContext({
        operation: 'TableFormatter.formatRaw',
      });

    // Validate inputs
    if (!Array.isArray(headers) || headers.length === 0) {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'Headers must be a non-empty array',
        logContext,
      );
    }

    if (!Array.isArray(rows)) {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'Rows must be an array',
        logContext,
      );
    }

    if (rows.length === 0) {
      logger.debug('Empty rows array provided to table formatter', logContext);
      return '';
    }

    // Validate row lengths
    const columnCount = headers.length;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]!.length !== columnCount) {
        throw new McpError(
          JsonRpcErrorCode.ValidationError,
          `Row ${i} has ${rows[i]!.length} columns but expected ${columnCount}`,
          { ...logContext, rowIndex: i, expectedColumns: columnCount },
        );
      }
    }

    // Merge options with defaults
    const opts: Required<TableFormatterOptions> = {
      ...this.defaultOptions,
      ...options,
      alignment: { ...this.defaultOptions.alignment, ...options?.alignment },
    };

    // Apply header styling
    const styledHeaders = this.applyHeaderStyle(headers, opts.headerStyle);

    // Calculate column widths and metadata
    const columns = this.calculateColumns(
      styledHeaders,
      rows,
      opts,
      logContext,
    );

    // Render table based on style
    try {
      const result = this.renderTable(columns, styledHeaders, rows, opts);

      logger.debug('Table formatted successfully', {
        ...logContext,
        style: opts.style,
        rows: rows.length,
        columns: columns.length,
      });

      return result;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('Failed to render table', {
        ...logContext,
        error: err.message,
      });

      throw new McpError(
        JsonRpcErrorCode.InternalError,
        `Failed to render table: ${err.message}`,
        { ...logContext, originalError: err.stack },
      );
    }
  }

  /**
   * Apply header styling transformations.
   * @private
   */
  private applyHeaderStyle(
    headers: string[],
    style: 'bold' | 'uppercase' | 'none',
  ): string[] {
    switch (style) {
      case 'uppercase':
        return headers.map((h) => h.toUpperCase());
      case 'bold':
      case 'none':
      default:
        return headers;
    }
  }

  /**
   * Calculate column widths and metadata.
   * @private
   */
  private calculateColumns(
    headers: string[],
    rows: string[][],
    options: Required<TableFormatterOptions>,
    context: RequestContext,
  ): ColumnInfo[] {
    const columns: ColumnInfo[] = headers.map((header, index) => {
      // Determine alignment (use configured or default to left)
      const alignment =
        options.alignment[header] ||
        options.alignment[index.toString()] ||
        'left';

      // Calculate max content width for this column
      const headerWidth = header.length;
      const maxContentWidth = Math.max(
        ...rows.map((row) => (row[index] || '').length),
      );

      // Determine final width (respecting min/max constraints)
      let width = Math.max(headerWidth, maxContentWidth);
      width = Math.max(width, options.minWidth);
      if (options.maxWidth && width > options.maxWidth) {
        width = options.maxWidth;
      }

      return { name: header, width, alignment };
    });

    logger.debug('Calculated column widths', {
      ...context,
      columns: columns.map((c) => ({ name: c.name, width: c.width })),
    });

    return columns;
  }

  /**
   * Render table using the specified style.
   * @private
   */
  private renderTable(
    columns: ColumnInfo[],
    headers: string[],
    rows: string[][],
    options: Required<TableFormatterOptions>,
  ): string {
    switch (options.style) {
      case 'markdown':
        return this.renderMarkdown(columns, headers, rows, options);
      case 'ascii':
        return this.renderAscii(columns, headers, rows, options);
      case 'grid':
        return this.renderGrid(columns, headers, rows, options);
      case 'compact':
        return this.renderCompact(columns, headers, rows, options);
      default:
        throw new Error(`Unknown table style: ${String(options.style)}`);
    }
  }

  /**
   * Render markdown-style table.
   * @private
   */
  private renderMarkdown(
    columns: ColumnInfo[],
    headers: string[],
    rows: string[][],
    options: Required<TableFormatterOptions>,
  ): string {
    const lines: string[] = [];
    const pad = ' '.repeat(options.padding);

    // Header row
    const headerCells = headers.map((header, i) =>
      this.formatCell(header, columns[i]!, options),
    );
    lines.push(`|${pad}${headerCells.join(`${pad}|${pad}`)}${pad}|`);

    // Separator row
    const separators = columns.map((col) => {
      const dashes = '-'.repeat(col.width);
      return dashes;
    });
    lines.push(`|${pad}${separators.join(`${pad}|${pad}`)}${pad}|`);

    // Data rows
    for (const row of rows) {
      const cells = row.map((cell, i) =>
        this.formatCell(cell, columns[i]!, options),
      );
      lines.push(`|${pad}${cells.join(`${pad}|${pad}`)}${pad}|`);
    }

    return lines.join('\n');
  }

  /**
   * Render ASCII box-drawing table.
   * @private
   */
  private renderAscii(
    columns: ColumnInfo[],
    headers: string[],
    rows: string[][],
    options: Required<TableFormatterOptions>,
  ): string {
    const lines: string[] = [];
    const pad = ' '.repeat(options.padding);

    // Top border
    const topBorder = columns
      .map((col) => '-'.repeat(col.width + options.padding * 2))
      .join('+');
    lines.push(`+${topBorder}+`);

    // Header row
    const headerCells = headers.map((header, i) =>
      this.formatCell(header, columns[i]!, options),
    );
    lines.push(`|${pad}${headerCells.join(`${pad}|${pad}`)}${pad}|`);

    // Header separator
    const headerSep = columns
      .map((col) => '-'.repeat(col.width + options.padding * 2))
      .join('+');
    lines.push(`+${headerSep}+`);

    // Data rows
    for (const row of rows) {
      const cells = row.map((cell, i) =>
        this.formatCell(cell, columns[i]!, options),
      );
      lines.push(`|${pad}${cells.join(`${pad}|${pad}`)}${pad}|`);
    }

    // Bottom border
    const bottomBorder = columns
      .map((col) => '-'.repeat(col.width + options.padding * 2))
      .join('+');
    lines.push(`+${bottomBorder}+`);

    return lines.join('\n');
  }

  /**
   * Render Unicode grid table.
   * @private
   */
  private renderGrid(
    columns: ColumnInfo[],
    headers: string[],
    rows: string[][],
    options: Required<TableFormatterOptions>,
  ): string {
    const lines: string[] = [];
    const pad = ' '.repeat(options.padding);

    // Top border
    const topBorder = columns
      .map((col) => '─'.repeat(col.width + options.padding * 2))
      .join('┬');
    lines.push(`┌${topBorder}┐`);

    // Header row
    const headerCells = headers.map((header, i) =>
      this.formatCell(header, columns[i]!, options),
    );
    lines.push(`│${pad}${headerCells.join(`${pad}│${pad}`)}${pad}│`);

    // Header separator
    const headerSep = columns
      .map((col) => '─'.repeat(col.width + options.padding * 2))
      .join('┼');
    lines.push(`├${headerSep}┤`);

    // Data rows
    for (const row of rows) {
      const cells = row.map((cell, i) =>
        this.formatCell(cell, columns[i]!, options),
      );
      lines.push(`│${pad}${cells.join(`${pad}│${pad}`)}${pad}│`);
    }

    // Bottom border
    const bottomBorder = columns
      .map((col) => '─'.repeat(col.width + options.padding * 2))
      .join('┴');
    lines.push(`└${bottomBorder}┘`);

    return lines.join('\n');
  }

  /**
   * Render compact space-separated table.
   * @private
   */
  private renderCompact(
    columns: ColumnInfo[],
    headers: string[],
    rows: string[][],
    options: Required<TableFormatterOptions>,
  ): string {
    const lines: string[] = [];
    const pad = ' '.repeat(options.padding * 2);

    // Header row
    const headerCells = headers.map((header, i) =>
      this.formatCell(header, columns[i]!, options),
    );
    lines.push(headerCells.join(pad));

    // Data rows
    for (const row of rows) {
      const cells = row.map((cell, i) =>
        this.formatCell(cell, columns[i]!, options),
      );
      lines.push(cells.join(pad));
    }

    return lines.join('\n');
  }

  /**
   * Format a single cell with alignment and truncation.
   * @private
   */
  private formatCell(
    content: string,
    column: ColumnInfo,
    options: Required<TableFormatterOptions>,
  ): string {
    let text = content;

    // Truncate if needed
    if (options.truncate && text.length > column.width) {
      text = text.substring(0, column.width - 3) + '...';
    }

    // Apply alignment padding
    const padding = column.width - text.length;
    if (padding <= 0) {
      return text;
    }

    switch (column.alignment) {
      case 'left':
        return text + ' '.repeat(padding);
      case 'right':
        return ' '.repeat(padding) + text;
      case 'center': {
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
      }
      default:
        return text;
    }
  }

  /**
   * Convert any value to a string for display in table.
   * @private
   */
  private stringify(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'function') return '[Function]';
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[Object]';
      }
    }
    return '[Unknown]';
  }
}

/**
 * Singleton instance of TableFormatter.
 * Use this instance to format tabular data into various table styles.
 *
 * @example
 * ```typescript
 * import { tableFormatter } from '@/utils/index.js';
 *
 * const data = [
 *   { name: 'Alice', age: 30, role: 'Engineer' },
 *   { name: 'Bob', age: 25, role: 'Designer' }
 * ];
 *
 * // Markdown table (default)
 * console.log(tableFormatter.format(data));
 *
 * // Grid table with right-aligned age
 * console.log(tableFormatter.format(data, {
 *   style: 'grid',
 *   alignment: { age: 'right' }
 * }));
 *
 * // Compact table with uppercase headers
 * console.log(tableFormatter.format(data, {
 *   style: 'compact',
 *   headerStyle: 'uppercase'
 * }));
 * ```
 */
export const tableFormatter = new TableFormatter();
