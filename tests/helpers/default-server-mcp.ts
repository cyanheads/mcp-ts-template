/**
 * @fileoverview Shared MCP protocol assertions for the default empty test server.
 * @module tests/integration/helpers/default-server-mcp
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { expect } from 'vitest';
import { z } from 'zod';

export function expectDefaultServerCapabilities(client: Client): void {
  const capabilities = client.getServerCapabilities();
  expect(capabilities).toMatchObject({
    logging: {},
    prompts: { listChanged: true },
    resources: { listChanged: true },
    tools: { listChanged: true },
  });
  // SEP-1686 tasks is gated on usage — default server has no task tools.
  expect(capabilities?.tasks).toBeUndefined();
}

export async function expectDefaultServerDiscoverySurface(client: Client): Promise<void> {
  const [tools, resources, resourceTemplates, prompts] = await Promise.all([
    client.listTools(),
    client.listResources(),
    client.listResourceTemplates(),
    client.listPrompts(),
  ]);

  expect(tools.tools).toEqual([]);
  expect(resources.resources).toEqual([]);
  expect(resourceTemplates.resourceTemplates).toEqual([]);
  expect(prompts.prompts).toEqual([]);
}

export async function expectDefaultServerProtocolErrors(client: Client): Promise<void> {
  const toolResult = await client.callTool({
    name: 'missing_tool',
    arguments: {},
  });

  expect(toolResult.isError).toBe(true);
  expect(toolResult.content).toContainEqual({
    type: 'text',
    text: 'MCP error -32602: Tool missing_tool not found',
  });

  await expect(
    client.readResource({
      uri: 'missing://resource/item',
    }),
  ).rejects.toMatchObject({
    code: ErrorCode.InvalidParams,
    message: expect.stringContaining('Resource missing://resource/item not found'),
  });

  await expect(
    client.getPrompt({
      name: 'missing_prompt',
    }),
  ).rejects.toMatchObject({
    code: ErrorCode.InvalidParams,
    message: expect.stringContaining('Prompt missing_prompt not found'),
  });
}

export async function expectDefaultServerTaskSurface(client: Client): Promise<void> {
  await expect(client.setLoggingLevel('debug')).resolves.toBeDefined();

  const tasks = await client.experimental.tasks.listTasks();
  expect(tasks.tasks).toEqual([]);
  expect(tasks.nextCursor).toBeUndefined();

  await expect(client.experimental.tasks.getTask('missing-task')).rejects.toMatchObject({
    code: ErrorCode.InvalidParams,
    message: expect.stringContaining('Task not found'),
  });

  await expect(client.experimental.tasks.cancelTask('missing-task')).rejects.toMatchObject({
    code: ErrorCode.InvalidParams,
    message: expect.stringContaining('Task not found'),
  });

  await expect(
    client.experimental.tasks.getTaskResult('missing-task', z.object({})),
  ).rejects.toMatchObject({
    code: ErrorCode.InvalidParams,
    message: expect.stringContaining('Task not found'),
  });
}
