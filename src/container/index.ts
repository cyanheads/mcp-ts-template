/**
 * @fileoverview Centralized dependency injection container setup.
 * This file acts as the Composition Root for the application, composing the
 * container by calling registration modules in a specific order. It also serves
 * as a barrel file for exporting the configured container and all DI tokens.
 * @module src/container
 */
import 'reflect-metadata';
import { container } from 'tsyringe';

import { registerCoreServices } from './registrations/core.js';
import { registerMcpServices } from './registrations/mcp.js';
import { registerTransportServices } from './registrations/transports.js';

// --- Register all services by calling modular registration functions ---
registerCoreServices();
registerMcpServices();
registerTransportServices();

// --- Export DI tokens and the configured container ---
export * from './tokens.js';
export default container;
