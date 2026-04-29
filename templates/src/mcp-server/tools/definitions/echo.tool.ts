/**
 * @fileoverview Echo tool — a minimal starting point for building MCP tools.
 * @module mcp-server/tools/definitions/echo.tool
 */

import { tool, z } from '@cyanheads/mcp-ts-core';
import { JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';

// Tool names are snake_case, prefixed with your server name to avoid collisions across servers.
// e.g. for a "tasks" server: tasks_fetch_list, tasks_create_item.
export const echoTool = tool('template_echo_message', {
  description: 'Echoes a message back. Replace this with your first real tool.',
  annotations: { readOnlyHint: true },
  input: z.object({
    message: z.string().describe('The message to echo back.'),
  }),
  output: z.object({
    message: z.string().describe('The echoed message.'),
  }),

  // Declare each domain failure mode the agent should plan around. The framework
  // types `ctx.fail(reason, …)` against the declared union. Baseline codes
  // (InternalError, ServiceUnavailable, Timeout, ValidationError,
  // SerializationError) bubble freely — only declare domain-specific reasons.
  // Delete this block if no domain-specific failures apply to your tool.
  errors: [
    {
      reason: 'empty_message',
      code: JsonRpcErrorCode.InvalidParams,
      when: 'Message contained only whitespace.',
      recovery: 'Provide a message with at least one non-whitespace character.',
    },
  ],

  handler(input, ctx) {
    if (input.message.trim().length === 0) {
      throw ctx.fail('empty_message', 'Message must contain at least one non-whitespace character.');
    }
    return { message: input.message };
  },

  // format() populates MCP content[] — the markdown twin of structuredContent.
  // Different clients read different surfaces (Claude Code → structuredContent,
  // Claude Desktop → content[]); both must carry the same data.
  // This echo tool is trivial; real tools should render every relevant field.
  format: (result) => [{ type: 'text', text: result.message }],
});
