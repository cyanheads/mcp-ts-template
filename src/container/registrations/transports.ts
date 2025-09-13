/**
 * @fileoverview Registers transport-related services with the DI container.
 * This module is responsible for registering the various transport managers
 * (Stateless, Stateful, Auto) and configuring the abstract TransportManager
 * token to resolve to the correct implementation based on the app config.
 * @module src/container/registrations/transports
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { container } from 'tsyringe';
import { config } from '../../config/index.js';
import {
  AutoTransportManager,
  StatefulTransportManager,
  StatelessTransportManager,
  TransportManager,
} from '../../mcp-server/transports/core/index.js';
import { storageService } from '../../storage/index.js';
import { logger } from '../../utils/index.js';
import {
  AppConfig,
  CreateMcpServerInstance,
  TransportManagerToken,
} from '../tokens.js';

/**
 * Registers all transport-related managers and resolves the correct one.
 */
export const registerTransportServices = () => {
  // --- Register Transport Managers (Concrete Classes) ---
  container.register(StatelessTransportManager, {
    useFactory: (c) =>
      new StatelessTransportManager(
        c.resolve<() => Promise<McpServer>>(CreateMcpServerInstance),
      ),
  });

  container.register(StatefulTransportManager, {
    useFactory: (c) => {
      const appConfig = c.resolve<typeof config>(AppConfig);
      return new StatefulTransportManager(
        storageService,
        c.resolve<() => Promise<McpServer>>(CreateMcpServerInstance),
        {
          staleSessionTimeoutMs: appConfig.mcpStatefulSessionStaleTimeoutMs,
          mcpHttpEndpointPath: appConfig.mcpHttpEndpointPath,
        },
      );
    },
  });

  container.register(AutoTransportManager, { useClass: AutoTransportManager });

  // --- Register Transport Manager Token (Abstract Interface) ---
  container.register<TransportManager>(TransportManagerToken, {
    useFactory: (c) => {
      const appConfig = c.resolve<typeof config>(AppConfig);
      switch (appConfig.mcpSessionMode) {
        case 'stateless':
          return c.resolve(StatelessTransportManager);
        case 'stateful':
          return c.resolve(StatefulTransportManager);
        case 'auto':
        default:
          return c.resolve(AutoTransportManager);
      }
    },
  });

  logger.info('Transport services registered with the DI container.');
};
