/**
 * @fileoverview Barrel file for all tool definitions.
 * This file re-exports all tool definitions for easy import and registration.
 * It also exports an array of all definitions for automated registration.
 * @module src/mcp-server/tools/definitions
 */

// Task tools (experimental)
import { asyncCountdownTool } from './template-async-countdown.tool.js';
import { catFactTool } from './template-cat-fact.tool.js';
import { codeReviewSamplingTool } from './template-code-review-sampling.tool.js';
// App tools (MCP Apps extension)
import { dataExplorerAppTool } from './template-data-explorer.app-tool.js';
import { echoTool } from './template-echo-message.tool.js';
import { imageTestTool } from './template-image-test.tool.js';
import { madlibsElicitationTool } from './template-madlibs-elicitation.tool.js';

/**
 * An array containing all tool definitions for easy iteration.
 * Includes both regular tools and task-based tools (experimental).
 */
export const allToolDefinitions = [
  // Regular tools
  catFactTool,
  codeReviewSamplingTool,
  echoTool,
  imageTestTool,
  madlibsElicitationTool,
  // Task tools (experimental)
  asyncCountdownTool,
  // App tools (MCP Apps extension)
  dataExplorerAppTool,
];
