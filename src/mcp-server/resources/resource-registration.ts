/**
 * @fileoverview Encapsulates the registration of all resource definitions for the application's
 * dependency injection (DI) container. This modular approach allows for clean separation of
 * concerns, making it easy to add or remove resources without modifying the core container setup.
 * @module src/mcp-server/resources/resource-registration
 */
import { DependencyContainer } from 'tsyringe';

import { ResourceDefinitions } from '../../container/index.js';
import { echoResourceDefinition } from './definitions/echo.resource.js';

/**
 * Registers all resource definitions with the provided dependency container.
 * This function uses multi-injection to register each resource under the `ResourceDefinitions` token.
 *
 * @param {DependencyContainer} container - The tsyringe container instance to register resources with.
 */
export const registerResources = (container: DependencyContainer): void => {
  container.register(ResourceDefinitions, { useValue: echoResourceDefinition });
};
