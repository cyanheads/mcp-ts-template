/**
 * @fileoverview Centralized dependency injection container setup.
 * This file acts as the Composition Root for the application, registering all
 * services, providers, and values that will be managed by the DI container.
 * @module src/container
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import 'reflect-metadata';
import { Lifecycle, container } from 'tsyringe';

import { config } from '../config/index.js';
import {
  ResourceRegistry,
  registerResources,
} from '../mcp-server/resources/resource-registration.js';
import { createMcpServerInstance } from '../mcp-server/server.js';
import {
  ToolRegistry,
  registerTools,
} from '../mcp-server/tools/tool-registration.js';
import {
  AutoTransportManager,
  // Import the new manager
  StatefulTransportManager,
  StatelessTransportManager,
  TransportManager,
} from '../mcp-server/transports/core/index.js';
import { ILlmProvider } from '../services/llm-providers/ILlmProvider.js';
import { OpenRouterProvider } from '../services/llm-providers/openRouterProvider.js';
import { createStorageProvider, storageService } from '../storage/index.js';
import { logger } from '../utils/index.js';
import { RateLimiter } from '../utils/security/rateLimiter.js';
import {
  AppConfig,
  CreateMcpServerInstance,
  LlmProvider,
  Logger,
  RateLimiterService,
  StorageService,
  TransportManagerToken,
} from './tokens.js';

// --- Injection Tokens ---
// Use tokens for non-class dependencies or for multi-injection.
export * from './tokens.js';

// --- Register Core Services & Values ---

// Configuration (as a static value)
container.register(AppConfig, { useValue: config });

// Logger (as a static value)
container.register(Logger, { useValue: logger });

// Storage Service (initialized and registered as a singleton)
const storageProvider = createStorageProvider();
storageService.initialize(storageProvider);
container.register(StorageService, { useValue: storageService });

// LLM Provider (register the class against the interface token)
container.register<ILlmProvider>(LlmProvider, {
  useClass: OpenRouterProvider,
});

// Register RateLimiter as a singleton service
container.register<RateLimiter>(
  RateLimiterService,
  { useClass: RateLimiter },
  { lifecycle: Lifecycle.Singleton },
);

// --- Register Registries ---
container.registerSingleton(ToolRegistry);
container.registerSingleton(ResourceRegistry);

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

// --- Register Tools & Resources (via modular functions) ---
registerTools(container);
registerResources(container);

// --- Register Factories ---
// Register the server factory function. It will be resolved by the transport layer.
container.register(CreateMcpServerInstance, {
  useValue: createMcpServerInstance,
});

export default container;
