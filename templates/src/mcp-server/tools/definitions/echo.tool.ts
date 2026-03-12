/**
 * @fileoverview Echo tool — a minimal starting point for building MCP tools.
 * @module mcp-server/tools/definitions/echo.tool
 */

import { z } from 'zod';
import { tool } from '@cyanheads/mcp-ts-core';

// Tool names are snake_case, prefixed with your server name to avoid collisions across servers. e.g. for a "tasks" server: tasks_fetch_list, tasks_create_item.
export const echoTool = tool('template_echo_message', {
  description: 'Echoes a message back. Replace this with your first real tool.', // Descriptions are what the LLM reads to decide when to call the tool.
  annotations: { readOnlyHint: true },
  input: z.object({
    message: z.string().describe('The message to echo back.'),
  }),
  output: z.object({
    message: z.string().describe('The echoed message.'),
  }), // All Zod fields need .describe() — that's LLM context too.

  handler(input, ctx) {
    ctx.log.info('Echoing message', { message: input.message });
    return { message: input.message }; // Handlers are pure: throw McpError on failure, no try/catch.
  },
});
