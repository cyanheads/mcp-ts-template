/**
 * @fileoverview Tree formatter utility for visualizing hierarchical data structures.
 * Supports ASCII, Unicode box-drawing, and compact tree styles with icons and metadata.
 * @module src/utils/formatting/treeFormatter
 */

import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';
import { type RequestContext, requestContextService } from '@/utils/internal/requestContext.js';

/**
 * Tree output style options.
 */
export type TreeStyle = 'ascii' | 'unicode' | 'compact';

/**
 * Node in a hierarchical tree structure.
 */
export interface TreeNode {
  /**
   * Optional child nodes.
   */
  children?: TreeNode[];

  /**
   * Optional metadata to display alongside the node.
   * Example: file size, count, type, etc.
   */
  metadata?: Record<string, unknown>;
  /**
   * Display name for this node.
   */
  name: string;
}

/**
 * Configuration options for tree formatting.
 */
export interface TreeFormatterOptions {
  /**
   * Icon to use for leaf nodes (files).
   * Default: '📄'
   */
  fileIcon?: string;

  /**
   * Icon to use for nodes with children (folders).
   * Default: '📁'
   */
  folderIcon?: string;

  /**
   * Whether to include icons/emojis for nodes.
   * Default: false
   */
  icons?: boolean;

  /**
   * Indentation string for each level.
   * Default: '  ' (two spaces)
   */
  indent?: string;

  /**
   * Maximum depth to render. Nodes beyond this depth are omitted.
   * Default: undefined (no limit)
   */
  maxDepth?: number;

  /**
   * Whether to display metadata alongside nodes.
   * Default: false
   */
  showMetadata?: boolean;
  /**
   * Tree rendering style.
   * - ascii: ASCII characters (+, -, |)
   * - unicode: Unicode box-drawing characters (├, └, │, ─)
   * - compact: Simple indentation with minimal decoration
   */
  style?: TreeStyle;
}

/**
 * Resolved tree formatter options with all defaults applied.
 * maxDepth remains optional since `undefined` means no limit.
 */
type ResolvedTreeOptions = Required<Omit<TreeFormatterOptions, 'maxDepth'>> & {
  maxDepth: number | undefined;
};

/**
 * Utility class for formatting hierarchical data as tree structures.
 * Visualizes nested data like directory structures, org charts, or any hierarchical data.
 */
export class TreeFormatter {
  /**
   * Default formatting options.
   * @private
   */
  private readonly defaultOptions: ResolvedTreeOptions = {
    style: 'unicode',
    maxDepth: undefined,
    showMetadata: false,
    icons: false,
    indent: '  ',
    folderIcon: '📁',
    fileIcon: '📄',
  };

  /**
   * Track seen nodes for circular reference detection.
   * @private
   */
  private seenNodes = new Set<TreeNode>();

  /**
   * Format a single tree structure.
   * Renders the tree with the specified style and options.
   *
   * @param root - Root node of the tree
   * @param options - Tree formatting options
   * @param context - Optional request context for logging
   * @returns Formatted tree string
   * @throws {McpError} If tree is invalid or rendering fails
   *
   * @example
   * ```typescript
   * const tree = {
   *   name: 'src',
   *   children: [
   *     { name: 'index.ts' },
   *     {
   *       name: 'utils',
   *       children: [
   *         { name: 'helper.ts' },
   *         { name: 'types.ts' }
   *       ]
   *     }
   *   ]
   * };
   * const formatted = treeFormatter.format(tree, { style: 'unicode', icons: true });
   * ```
   */
  format(root: TreeNode, options?: TreeFormatterOptions, context?: RequestContext): string {
    const logContext =
      context ||
      requestContextService.createRequestContext({
        operation: 'TreeFormatter.format',
      });

    // Validate input
    if (!root || typeof root.name !== 'string') {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'Root node must have a name property',
        logContext,
      );
    }

    const opts = {
      ...this.defaultOptions,
      ...options,
    };

    try {
      // Reset circular reference detection
      this.seenNodes.clear();

      logger.debug('Formatting tree structure', {
        ...logContext,
        rootName: root.name,
        style: opts.style,
      });

      const lines: string[] = [];
      this.renderNode(root, '', true, true, lines, opts, 0);

      const result = lines.join('\n');

      logger.debug('Tree formatted successfully', {
        ...logContext,
        lineCount: lines.length,
      });

      return result;
    } catch (error: unknown) {
      if (error instanceof McpError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      logger.error('Failed to format tree', {
        ...logContext,
        error: message,
      });

      throw new McpError(JsonRpcErrorCode.InternalError, `Failed to format tree: ${message}`, {
        ...logContext,
        originalError: stack,
      });
    }
  }

  /**
   * Format multiple tree roots (forest visualization).
   * Useful for displaying multiple top-level structures.
   *
   * @param roots - Array of root nodes
   * @param options - Tree formatting options
   * @param context - Optional request context for logging
   * @returns Formatted tree string
   * @throws {McpError} If trees are invalid or rendering fails
   *
   * @example
   * ```typescript
   * const roots = [
   *   { name: 'src', children: [...] },
   *   { name: 'tests', children: [...] },
   *   { name: 'docs', children: [...] }
   * ];
   * const formatted = treeFormatter.formatMultiple(roots);
   * ```
   */
  formatMultiple(
    roots: TreeNode[],
    options?: TreeFormatterOptions,
    context?: RequestContext,
  ): string {
    const logContext =
      context ||
      requestContextService.createRequestContext({
        operation: 'TreeFormatter.formatMultiple',
      });

    if (!Array.isArray(roots) || roots.length === 0) {
      throw new McpError(
        JsonRpcErrorCode.ValidationError,
        'Roots must be a non-empty array',
        logContext,
      );
    }

    try {
      logger.debug('Formatting multiple tree structures', {
        ...logContext,
        count: roots.length,
      });

      const results = roots.map((root) => this.format(root, options, logContext));

      return results.join('\n\n');
    } catch (error: unknown) {
      if (error instanceof McpError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      throw new McpError(
        JsonRpcErrorCode.InternalError,
        `Failed to format multiple trees: ${message}`,
        { ...logContext, originalError: stack },
      );
    }
  }

  /**
   * Recursively render a tree node and its children.
   * @private
   */
  private renderNode(
    node: TreeNode,
    prefix: string,
    isRoot: boolean,
    isLast: boolean,
    lines: string[],
    options: Required<Omit<TreeFormatterOptions, 'maxDepth'>> & {
      maxDepth: number | undefined;
    },
    depth: number,
  ): void {
    // Check max depth
    if (options.maxDepth !== undefined && depth > options.maxDepth) {
      return;
    }

    // Check for circular references
    if (this.seenNodes.has(node)) {
      lines.push(
        `${prefix}${this.getConnector('circular', isLast, options.style)} [Circular Reference]`,
      );
      return;
    }

    this.seenNodes.add(node);

    // Build node line
    const connector = isRoot ? '' : this.getConnector('node', isLast, options.style);

    const icon = this.getIcon(node, options);
    const name = node.name;
    const metadata = this.formatMetadata(node, options);

    const line = `${prefix}${connector}${icon}${name}${metadata}`;
    lines.push(line);

    // Render children
    const children = node.children || [];
    if (children.length > 0) {
      const childPrefix = isRoot
        ? ''
        : prefix + this.getChildPrefix(isLast, options.style, options.indent);

      children.forEach((child, index) => {
        const isLastChild = index === children.length - 1;
        this.renderNode(child, childPrefix, false, isLastChild, lines, options, depth + 1);
      });
    }

    this.seenNodes.delete(node);
  }

  /**
   * Get the appropriate connector character based on style.
   * @private
   */
  private getConnector(type: 'node' | 'circular', isLast: boolean, style: TreeStyle): string {
    if (type === 'circular') {
      return style === 'compact' ? '  ' : isLast ? '└─ ' : '├─ ';
    }

    switch (style) {
      case 'unicode':
        return isLast ? '└── ' : '├── ';
      case 'ascii':
        return isLast ? '\\-- ' : '+-- ';
      case 'compact':
        return '';
      default:
        return '';
    }
  }

  /**
   * Get the prefix for child nodes based on parent's position.
   * @private
   */
  private getChildPrefix(isLast: boolean, style: TreeStyle, indent: string): string {
    // When not the last child, replace the first character of indent with a vertical
    // connector so the tree lines stay visually connected. Pad to match indent width.
    const padding = indent.length > 1 ? ' '.repeat(indent.length - 1) : '';
    switch (style) {
      case 'unicode':
        return isLast ? indent : `│${padding}`;
      case 'ascii':
        return isLast ? indent : `|${padding}`;
      case 'compact':
        return indent;
      default:
        return indent;
    }
  }

  /**
   * Get icon for a node based on whether it has children.
   * @private
   */
  private getIcon(
    node: TreeNode,
    options: Required<Omit<TreeFormatterOptions, 'maxDepth'>> & {
      maxDepth: number | undefined;
    },
  ): string {
    if (!options.icons) {
      return '';
    }

    const hasChildren = node.children && node.children.length > 0;
    const icon = hasChildren ? options.folderIcon : options.fileIcon;

    return `${icon} `;
  }

  /**
   * Format metadata for display.
   * @private
   */
  private formatMetadata(
    node: TreeNode,
    options: Required<Omit<TreeFormatterOptions, 'maxDepth'>> & {
      maxDepth: number | undefined;
    },
  ): string {
    if (!options.showMetadata || !node.metadata) {
      return '';
    }

    const entries = Object.entries(node.metadata)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(', ');

    return entries ? ` (${entries})` : '';
  }
}

/**
 * Singleton instance of TreeFormatter.
 * Use this instance to format hierarchical data as tree structures.
 *
 * @example
 * ```typescript
 * import { treeFormatter } from '@/utils/formatting/treeFormatter.js';
 *
 * // Simple directory tree
 * const tree = {
 *   name: 'project',
 *   children: [
 *     {
 *       name: 'src',
 *       children: [
 *         { name: 'index.ts' },
 *         { name: 'types.ts' }
 *       ]
 *     },
 *     { name: 'package.json' },
 *     { name: 'README.md' }
 *   ]
 * };
 *
 * // Unicode tree with icons
 * console.log(treeFormatter.format(tree, {
 *   style: 'unicode',
 *   icons: true
 * }));
 * // 📁 project
 * // ├── 📁 src
 * // │   ├── 📄 index.ts
 * // │   └── 📄 types.ts
 * // ├── 📄 package.json
 * // └── 📄 README.md
 *
 * // With metadata
 * const treeWithMeta = {
 *   name: 'files',
 *   metadata: { count: 3 },
 *   children: [
 *     { name: 'file1.txt', metadata: { size: '1KB' } },
 *     { name: 'file2.txt', metadata: { size: '2KB' } }
 *   ]
 * };
 *
 * console.log(treeFormatter.format(treeWithMeta, {
 *   showMetadata: true
 * }));
 * ```
 */
export const treeFormatter = new TreeFormatter();
