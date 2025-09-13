/**
 * @fileoverview Barrel file exporting all resource definitions.
 * This centralized export allows for automated registration.
 * @module src/mcp-server/resources/definitions
 */

import { echoResourceDefinition } from './echo.resource.js';

/**
 * An array containing all resource definitions for easy iteration.
 */
export const allResourceDefinitions = [echoResourceDefinition];
