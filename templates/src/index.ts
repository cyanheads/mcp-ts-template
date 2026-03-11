#!/usr/bin/env node
/**
 * @fileoverview {{SERVER_NAME}} MCP server entry point.
 * @module index
 */

import { createApp } from '@cyanheads/mcp-ts-core';
import { allToolDefinitions } from './mcp-server/tools/index.js';
import { allResourceDefinitions } from './mcp-server/resources/index.js';
import { allPromptDefinitions } from './mcp-server/prompts/index.js';

await createApp({
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
});
