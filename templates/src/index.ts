#!/usr/bin/env node
/**
 * @fileoverview {{SERVER_NAME}} MCP server entry point.
 * @module index
 */

import { createApp } from '@cyanheads/mcp-ts-core';
import { echoTool } from './mcp-server/tools/definitions/echo.tool.js';
import { echoResource } from './mcp-server/resources/definitions/echo.resource.js';
import { echoPrompt } from './mcp-server/prompts/definitions/echo.prompt.js';

await createApp({
  tools: [echoTool],
  resources: [echoResource],
  prompts: [echoPrompt],
});
