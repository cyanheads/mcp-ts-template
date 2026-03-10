/**
 * @fileoverview Shared regex for detecting LLM <think> blocks in parser inputs.
 * @module src/utils/parsing/thinkBlock
 */

/**
 * Regular expression to find a <think> block at the start of a string.
 * Captures content within <think>...</think> (Group 1) and the rest of the string (Group 2).
 */
export const thinkBlockRegex = /^<think>([\s\S]*?)<\/think>\s*([\s\S]*)$/;
