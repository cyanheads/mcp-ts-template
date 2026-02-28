/**
 * @fileoverview Barrel file for formatting utility modules.
 * This file re-exports utilities for building structured output formats including
 * markdown, tables, diffs, and tree structures.
 * @module utils/formatting
 */

export {
  type DiffFormat,
  DiffFormatter,
  type DiffFormatterOptions,
  diffFormatter,
} from './diffFormatter.js';
export { MarkdownBuilder, markdown } from './markdownBuilder.js';
export {
  type Alignment,
  TableFormatter,
  type TableFormatterOptions,
  type TableStyle,
  tableFormatter,
} from './tableFormatter.js';
export {
  TreeFormatter,
  type TreeFormatterOptions,
  type TreeNode,
  type TreeStyle,
  treeFormatter,
} from './treeFormatter.js';
