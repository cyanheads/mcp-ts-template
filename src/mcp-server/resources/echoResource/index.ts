/**
 * @fileoverview Barrel file for the `echo` resource.
 * This file serves as the public interface for the echo resource module,
 * primarily exporting the `registerEchoResource` function. This function is
 * responsible for registering the echo resource, including its templates and handler,
 * with an MCP server instance. This makes the resource accessible to clients
 * via defined URI patterns.
 *
 * Consuming modules should import from this barrel file to access
 * the echo resource's registration capabilities.
 * @module src/mcp-server/resources/echoResource/index
 */

export { registerEchoResource } from './registration.js';
