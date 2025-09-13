/**
 * @fileoverview Centralized dependency injection container setup.
 * This file acts as the Composition Root for the application, registering all
 * services, providers, and values that will be managed by the DI container.
 * @module src/container
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import 'reflect-metadata';
import { container, Lifecycle } from 'tsyringe';

import { config } from '../config/index.js';
import { registerResources } from '../mcp-server/resources/resource-registration.js';
import { createMcpServerInstance } from '../mcp-server/server.js';
import { registerTools } from '../mcp-server/tools/tool-registration.js';
import {
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
  TransportManagerToken
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
container.register<ILlmProvider>(LlmProvider, { useClass: OpenRouterProvider });

// Register RateLimiter as a singleton service
container.register<RateLimiter>(
  RateLimiterService,
  { useClass: RateLimiter },
  { lifecycle: Lifecycle.Singleton },
);

// --- Register Transport Manager based on config ---
container.register<TransportManager>(TransportManagerToken, {
  useFactory: (c) => {
    const appConfig = c.resolve<typeof config>(AppConfig);
    const createMcpFn = c.resolve<() => Promise<McpServer>>(
      CreateMcpServerInstance,
    );

    switch (appConfig.mcpSessionMode) {
      case 'stateless':
        return new StatelessTransportManager(createMcpFn);
      case 'stateful':
      case 'auto':
      default:
        return new StatefulTransportManager(
          createMcpFn,
          {
            staleSessionTimeoutMs: appConfig.mcpStatefulSessionStaleTimeoutMs,
            mcpHttpEndpointPath: appConfig.mcpHttpEndpointPath,
          },
          appConfig.mcpSessionMode,
        );
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
