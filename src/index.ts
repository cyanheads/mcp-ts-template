#!/usr/bin/env node
/**
 * @fileoverview Main entry point for the MCP TypeScript Template application.
 * This script initializes the configuration, sets up the logger, starts the
 * MCP server (either via STDIO or HTTP transport), and handles graceful
 * shutdown on process signals or unhandled errors.
 * @module src/index
 */
// IMPORTANT: This import MUST be first to initialize OpenTelemetry
// before any other modules are loaded. Use package subpath for env mapping.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import http from 'http';
import { McpLogLevel, logger } from 'mcp-ts-template/utils/internal/logger.js';
import { shutdownOpenTelemetry } from 'mcp-ts-template/utils/telemetry/instrumentation.js';

import { config } from './config/index.js';
import { initializeAndStartServer } from './mcp-server/server.js';
import { TransportManager } from './mcp-server/transports/core/transportTypes.js';
import { createStorageProvider, storageService } from './storage/index.js';
import { requestContextService } from './utils/index.js';

let mcpStdioServer: McpServer | undefined;
let actualHttpServer: http.Server | undefined;
let transportManager: TransportManager | undefined; // <-- Add this line

const shutdown = async (signal: string): Promise<void> => {
  const shutdownContext = requestContextService.createRequestContext({
    operation: 'ServerShutdown',
    triggerEvent: signal,
  });

  logger.info(
    `Received ${signal}. Initiating graceful shutdown...`,
    shutdownContext,
  );

  try {
    // Shutdown OpenTelemetry first to ensure buffered telemetry is sent
    await shutdownOpenTelemetry();
    // Close logger transports to flush logs
    await logger.close();

    // Shut down the transport manager to clean up sessions
    if (transportManager) {
      logger.info('Shutting down transport manager...', shutdownContext);
      await transportManager.shutdown();
      logger.info('Transport manager shut down successfully.', shutdownContext);
    }

    let closePromise: Promise<void> = Promise.resolve();
    const transportType = config.mcpTransportType;

    if (transportType === 'stdio' && mcpStdioServer) {
      logger.info(
        'Attempting to close main MCP server (STDIO)...',
        shutdownContext,
      );
      closePromise = mcpStdioServer.close();
    } else if (transportType === 'http' && actualHttpServer) {
      logger.info('Attempting to close HTTP server...', shutdownContext);
      closePromise = new Promise((resolve, reject) => {
        actualHttpServer!.close((err) => {
          if (err) {
            logger.error('Error closing HTTP server.', err, shutdownContext);
            return reject(err);
          }
          logger.info('HTTP server closed successfully.', shutdownContext);
          resolve();
        });
      });
    }

    await closePromise;
    logger.info(
      'Graceful shutdown completed successfully. Exiting.',
      shutdownContext,
    );
    process.exit(0);
  } catch (error) {
    logger.error(
      'Critical error during shutdown process.',
      error as Error,
      shutdownContext,
    );
    try {
      await logger.close();
    } catch {}
    process.exit(1);
  }
};

const start = async (): Promise<void> => {
  const validMcpLogLevels: McpLogLevel[] = [
    'debug',
    'info',
    'notice',
    'warning',
    'error',
    'crit',
    'alert',
    'emerg',
  ];
  const initialLogLevelConfig = config.logLevel;

  let validatedMcpLogLevel: McpLogLevel = 'info';
  if (validMcpLogLevels.includes(initialLogLevelConfig as McpLogLevel)) {
    validatedMcpLogLevel = initialLogLevelConfig as McpLogLevel;
  } else {
    if (process.stdout.isTTY) {
      console.warn(
        `[Startup Warning] Invalid MCP_LOG_LEVEL "${initialLogLevelConfig}". Defaulting to "info".`,
      );
    }
  }

  await logger.initialize(validatedMcpLogLevel);
  logger.info(
    `Logger initialized. Effective MCP logging level: ${validatedMcpLogLevel}.`,
    requestContextService.createRequestContext({ operation: 'LoggerInit' }),
  );

  // Initialize Storage Service
  try {
    const storageProvider = createStorageProvider();
    storageService.initialize(storageProvider);
    logger.info(
      `Storage service initialized with provider: ${config.storage.providerType}`,
      requestContextService.createRequestContext({ operation: 'StorageInit' }),
    );
  } catch (error) {
    logger.fatal(
      'Failed to initialize storage service.',
      error as Error,
      requestContextService.createRequestContext({ operation: 'StorageInit' }),
    );
    process.exit(1);
  }

  const transportType = config.mcpTransportType;
  const startupContext = requestContextService.createRequestContext({
    operation: `ServerStartupSequence_${transportType}`,
    applicationName: config.mcpServerName,
    applicationVersion: config.mcpServerVersion,
    nodeEnvironment: config.environment,
  });

  logger.info(
    `Starting ${config.mcpServerName} (Version: ${config.mcpServerVersion}, Transport: ${transportType}, Env: ${config.environment})...`,
    startupContext,
  );

  try {
    const serverInstanceOrHttpBundle = await initializeAndStartServer();

    if (
      transportType === 'http' &&
      'server' in serverInstanceOrHttpBundle &&
      'transportManager' in serverInstanceOrHttpBundle
    ) {
      actualHttpServer = serverInstanceOrHttpBundle.server as http.Server;
      transportManager =
        serverInstanceOrHttpBundle.transportManager as TransportManager;
    } else if (transportType === 'stdio') {
      const bundle = serverInstanceOrHttpBundle as {
        server: McpServer;
        transportManager: undefined;
      };
      mcpStdioServer = bundle.server;
      // Note: Stdio transport is stateless and its manager doesn't need explicit shutdown here.
    }

    logger.info(
      `${config.mcpServerName} is now running and ready.`,
      startupContext,
    );

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('uncaughtException', (error: Error) => {
      logger.fatal(
        'FATAL: Uncaught exception detected.',
        error,
        startupContext,
      );
      void shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason: unknown) => {
      logger.fatal(
        'FATAL: Unhandled promise rejection detected.',
        reason as Error,
        startupContext,
      );
      void shutdown('unhandledRejection');
    });
  } catch (error) {
    logger.fatal(
      'CRITICAL ERROR DURING STARTUP.',
      error as Error,
      startupContext,
    );
    await shutdownOpenTelemetry(); // Attempt to flush any startup-related traces
    process.exit(1);
  }
};

void (async () => {
  try {
    await start();
  } catch (error) {
    if (process.stdout.isTTY) {
      console.error('[GLOBAL CATCH] A fatal, unhandled error occurred:', error);
    }
    process.exit(1);
  }
})();
