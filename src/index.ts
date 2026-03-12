#!/usr/bin/env node
/**
 * @fileoverview Template server entry point. Registers the built-in example
 * definitions and starts the server via createApp().
 * @module src/index
 */

import { createApp } from '@/app.js';
import { allPromptDefinitions } from '@/mcp-server/prompts/definitions/index.js';
import { allResourceDefinitions } from '@/mcp-server/resources/definitions/index.js';
import { allToolDefinitions } from '@/mcp-server/tools/definitions/index.js';

await createApp({
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
});
