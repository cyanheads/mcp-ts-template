/**
 * @fileoverview Barrel file exporting all tool definitions.
 * This centralized export allows for automated registration.
 * @module src/mcp-server/tools/definitions
 */

import { catFactTool } from './template-cat-fact.tool.js';
import { echoTool } from './template-echo-message.tool.js';
import { imageTestTool } from './template-image-test.tool.js';

/**
 * An array containing all tool definitions for easy iteration.
 */
export const allToolDefinitions = [echoTool, catFactTool, imageTestTool];
