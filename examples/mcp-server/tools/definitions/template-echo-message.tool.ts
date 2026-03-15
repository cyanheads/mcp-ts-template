/**
 * @fileoverview Template echo tool — demonstrates the `tool()` builder API.
 * Echoes a message back with optional formatting and repetition.
 * @module examples/mcp-server/tools/definitions/template-echo-message.tool
 */

import { tool, z } from '@cyanheads/mcp-ts-core';
import { markdown } from '@cyanheads/mcp-ts-core/utils';

/** Special input which deliberately triggers a failure for testing. */
export const TEST_ERROR_TRIGGER_MESSAGE = 'TRIGGER_ERROR';

const ECHO_MODES = ['standard', 'uppercase', 'lowercase'] as const;

const InputSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty.')
    .max(1000, 'Message cannot exceed 1000 characters.')
    .describe(
      `The message to echo back. To trigger a test error, provide '${TEST_ERROR_TRIGGER_MESSAGE}'.`,
    ),
  mode: z
    .enum(ECHO_MODES)
    .default('standard')
    .describe("How to format the message ('standard' | 'uppercase' | 'lowercase')."),
  repeat: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(1)
    .describe('Number of times to repeat the formatted message.'),
  includeTimestamp: z
    .boolean()
    .default(false)
    .describe('Whether to include an ISO 8601 timestamp in the response.'),
});

const OutputSchema = z.object({
  originalMessage: z.string().describe('The original message provided in the input.'),
  formattedMessage: z.string().describe('The message after applying the specified formatting.'),
  repeatedMessage: z.string().describe('The final message repeated the requested number of times.'),
  mode: z.enum(ECHO_MODES).describe('The formatting mode that was applied.'),
  repeatCount: z.number().int().min(1).describe('The number of times the message was repeated.'),
  timestamp: z.iso
    .datetime()
    .optional()
    .describe('Optional ISO 8601 timestamp of when the response was generated.'),
});

export const echoTool = tool('template_echo_message', {
  title: 'Template Echo Message',
  description: 'Echoes a message back with optional formatting and repetition.',
  input: InputSchema,
  output: OutputSchema,
  auth: ['tool:echo:read'],
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },

  handler(input, ctx) {
    ctx.log.debug('Processing echo message', { toolInput: input });

    if (input.message === TEST_ERROR_TRIGGER_MESSAGE) {
      throw new Error('Deliberate failure triggered.');
    }

    const formattedMessage =
      input.mode === 'uppercase'
        ? input.message.toUpperCase()
        : input.mode === 'lowercase'
          ? input.message.toLowerCase()
          : input.message;

    const repeatedMessage = Array(input.repeat).fill(formattedMessage).join(' ');

    return {
      originalMessage: input.message,
      formattedMessage,
      repeatedMessage,
      mode: input.mode,
      repeatCount: input.repeat,
      ...(input.includeTimestamp && { timestamp: new Date().toISOString() }),
    };
  },

  format(result) {
    const preview =
      result.repeatedMessage.length > 200
        ? `${result.repeatedMessage.slice(0, 197)}…`
        : result.repeatedMessage;

    const md = markdown()
      .text(`Echo (mode=${result.mode}, repeat=${result.repeatCount})\n`)
      .text(`${preview}`);

    md.when(!!result.timestamp, () => {
      md.text(`\ntimestamp=${result.timestamp}`);
    });

    return [{ type: 'text', text: md.build() }];
  },
});
