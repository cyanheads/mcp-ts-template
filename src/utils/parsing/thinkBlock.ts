/**
 * @fileoverview Shared regex for detecting LLM <think> blocks in parser inputs.
 * @module src/utils/parsing/thinkBlock
 */

/**
 * Regular expression to find a `<think>` block at the start of a string.
 *
 * Anchored to the very beginning of the string (`^`). Matches the first
 * (non-greedy) `<think>...</think>` pair, capturing:
 * - **Group 1:** The raw text content inside the `<think>` block.
 * - **Group 2:** Everything after the closing `</think>` tag (stripped of
 *   leading whitespace), i.e. the actual payload to parse.
 *
 * Only matches when the `<think>` tag is the very first character of the
 * input. A `<think>` block that appears mid-string is intentionally ignored.
 *
 * @example
 * ```typescript
 * import { thinkBlockRegex } from './thinkBlock.js';
 *
 * const input = '<think>internal reasoning</think>\nkey: value';
 * const match = input.match(thinkBlockRegex);
 * // match[1] → 'internal reasoning'
 * // match[2] → 'key: value'
 *
 * const noThink = 'key: value';
 * noThink.match(thinkBlockRegex); // → null
 * ```
 */
export const thinkBlockRegex = /^<think>([\s\S]*?)<\/think>\s*([\s\S]*)$/;
