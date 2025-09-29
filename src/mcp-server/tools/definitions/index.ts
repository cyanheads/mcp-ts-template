/**
 * @fileoverview Barrel file for all tool definitions.
 * This file re-exports all tool definitions for easy import and registration.
 * It also exports an array of all definitions for automated registration.
 * @module src/mcp-server/tools/definitions
 */

import { catFactTool } from './template-cat-fact.tool.js';
import { codeReviewSamplingTool } from './template-code-review-sampling.tool.js';
import { echoTool } from './template-echo-message.tool.js';
import { imageTestTool } from './template-image-test.tool.js';
import { madlibsElicitationTool } from './template-madlibs-elicitation.tool.js';

/**
 * An array containing all tool definitions for easy iteration.
 */
export const allToolDefinitions = [
  catFactTool,
  codeReviewSamplingTool,
  echoTool,
  imageTestTool,
  madlibsElicitationTool,
];
